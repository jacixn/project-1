import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import PlayerChrome from './PlayerChrome';

// Plays an exercise tutorial inside Biblely instead of sending the user to the
// YouTube app. Ported from EyeCandy's trailer player, which was worked out
// against a real WKWebView; the page below is that same page, unchanged, so a
// fix in one app can be carried to the other by copying it across.
//
// EMBED_ORIGIN is load bearing, not decoration. The page is handed to the web
// view as HTML with this as its base URL, which is what the document's origin
// becomes, and that origin is what YouTube checks before it will serve an
// embed. Pointing it at https://www.youtube.com makes every video fail with
// IFrame API error 152, because YouTube refuses to be embedded inside itself,
// and leaving it out entirely gives 153, no embedder identity at all. Both are
// pinned by scripts/test-exercise-video.js. Keep it a domain Biblely owns.
export const EMBED_ORIGIN = 'https://biblely.uk';

// The WebView native module is already in the build (BodyMap3D uses it), but a
// lazy require plus an error boundary costs nothing and keeps an older dev
// client from crashing the screen.
let WebView = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

// iOS silences web view audio when the ring switch is off unless the app's
// audio session says otherwise, and a muted form tutorial is a worse tutorial.
let audioModeOnce = null;
const ensureAudioMode = () => {
  if (!audioModeOnce) {
    audioModeOnce = Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
  }
  return audioModeOnce;
};

// How long a player page gets to report itself ready before the trailer is
// treated as unplayable. Covers the page never loading at all: the IFrame
// API script hanging, or a web view that never paints.
const READY_DEADLINE_MS = 15000;
// And how long a ready player gets to actually reach PLAYING. Ready only
// means the page loaded; an embed can report ready and then sit at a black
// frame forever, with the spinner already dismissed and the load deadline
// above already cleared. Measured first frame is 1.7s to 2.6s on a fast
// connection, so this is generous rather than tight.
const PLAY_DEADLINE_MS = 12000;
// How long unmuted autoplay gets before retrying muted.
const UNMUTED_GRACE_MS = 2500;

// IFrame API error codes, split by whose fault they are.
//
// 2, 5, 100, 101, 150 are about this one video: a bad id, the HTML5 player
// refusing it, removed, or embedding turned off by its owner. The list steps
// over it to the next trailer.
//
// 152 and 153 are about this page and hit every video at once. 153 is "no
// embedder identity at all", which is what an absent base URL gives; 152 is
// "identity refused", which is what EMBED_ORIGIN pointing at YouTube gives.
// Both are verified in scripts/test-trailer-page.js. Walking the whole list
// on one of these only buries the real cause under "none of these trailers
// can be played", so they are reported as a player fault instead.
const CONFIG_ERRORS = [152, 153];

const playerHtml = (videoId) => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}
/* YouTube's own chrome (title, channel, share, More videos, the logo, the
   scrub bar) only appears in response to a pointer, so the iframe is given
   none. Controls are off as well, and the app draws its own in their place.
   Nothing is scaled or cropped to achieve this: the video fills the box. */
#player{position:absolute;top:0;left:0;width:100%;height:100%;border:0;pointer-events:none;}
</style>
</head>
<body>
<div id="player"></div>
<script>
(function(){
  var post = function(t, d){ try { window.ReactNativeWebView.postMessage(JSON.stringify({ t: t, d: d === undefined ? null : d })); } catch(e){} };
  var player = null, started = false;
  // Player states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued.
  var state = function(){ try { return player.getPlayerState(); } catch(e){ return -1; } };

  window.__cmd = function(c, v){
    if (!player) return;
    try {
      if (c === 'play') player.playVideo();
      else if (c === 'pause') player.pauseVideo();
      else if (c === 'toggle') { if (state() === 1) player.pauseVideo(); else player.playVideo(); }
      else if (c === 'seek') { player.seekTo(Number(v) || 0, true); player.playVideo(); }
      else if (c === 'unmute') {
        player.unMute();
        player.setVolume(100);
        // Never resume a video the viewer paused on purpose: turning the
        // sound on is not a request to play.
        if (state() !== 2) player.playVideo();
      }
    } catch(e){}
  };

  // The app draws the progress line, so it needs the numbers YouTube's own
  // scrub bar would have shown. Twice a second is smooth at this width and
  // costs nothing.
  setInterval(function(){
    if (!player) return;
    try {
      var st = state();
      post('time', { at: player.getCurrentTime(), of: player.getDuration(), playing: st === 1 || st === 3 });
    } catch(e){}
  }, 500);

  window.onYouTubeIframeAPIReady = function(){
    try {
      player = new YT.Player('player', {
        videoId: ${JSON.stringify(videoId)},
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          controls: 0,
          rel: 0,
          fs: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          origin: location.origin
        },
        events: {
          onReady: function(e){
            post('ready');
            try { e.target.playVideo(); } catch(x){}
            setTimeout(function(){
              // Buffering counts as started. On a slow connection the first
              // frame is seconds away, and muting a trailer that was never
              // blocked is worse than waiting for it.
              var st = state();
              if (started || st === 1 || st === 3) return;
              try { e.target.mute(); e.target.playVideo(); } catch(x){}
            }, ${UNMUTED_GRACE_MS});
          },
          onStateChange: function(e){
            if (e.data === 1 || e.data === 3) started = true;
            // Report the player's real mute state every time rather than
            // remembering that the fallback once fired, so turning the sound
            // on makes the control stay gone.
            if (e.data === 1) post(player.isMuted() ? 'playingMuted' : 'playing');
            else if (e.data === 0) post('ended');
          },
          onError: function(e){ post('error', e.data); }
        }
      });
    } catch(e){
      // A malformed video id throws out of the constructor instead of
      // reporting an error, so without this the page goes completely silent
      // and the app waits out its whole deadline before the next trailer.
      post('error', 'badid');
    }
  };

  var s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.onerror = function(){ post('error', 'api'); };
  document.body.appendChild(s);
})();
</script>
</body>
</html>`;

class PlayerBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { if (__DEV__) console.warn('[ExerciseVideo] player failed to render:', e?.message); this.props.onFail?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export const VideoUnavailable = ({ width, height, videoId, message, onOpenYouTube }) => (
  <View style={[styles.box, { width, height }]}>
    <Ionicons name="videocam-off-outline" size={26} color="rgba(255,255,255,0.7)" />
    <Text style={styles.unavailableText}>{message}</Text>
    <TouchableOpacity
      onPress={() => {
        if (onOpenYouTube) return onOpenYouTube();
        if (videoId) Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`).catch(() => {});
      }}
      activeOpacity={0.7}
      style={styles.linkPill}
      accessibilityRole="link"
    >
      <Text style={styles.linkText}>Open on YouTube</Text>
    </TouchableOpacity>
  </View>
);

const ExerciseVideoPlayer = ({ videoId, width, height, playing = true, onEnd, onReady, onUnplayable }) => {
  const webRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [playedOnce, setPlayedOnce] = useState(false);
  const [muted, setMuted] = useState(false);
  // YouTube's own scrub bar and buttons are off, so the numbers behind the
  // app's own controls come from the page instead.
  const [clock, setClock] = useState({ at: 0, of: 0, running: false });
  const html = useMemo(() => playerHtml(videoId), [videoId]);

  // One video reports itself unplayable at most once, whichever signal
  // arrives first. `fault` means the page could not embed anything, so the
  // next candidate would fail identically and the list should stop.
  const spentRef = useRef(false);
  const giveUp = useCallback((reason, fault) => {
    if (spentRef.current) return;
    spentRef.current = true;
    if (__DEV__) {
      if (fault) console.warn('[ExerciseVideo] player fault:', reason, '- embedding origin', EMBED_ORIGIN);
      else console.warn('[ExerciseVideo] unplayable', videoId, reason);
    }
    onUnplayable?.(reason, !!fault);
  }, [onUnplayable, videoId]);

  useEffect(() => { ensureAudioMode(); }, []);
  useEffect(() => { spentRef.current = false; setReady(false); setPlayedOnce(false); setMuted(false); setClock({ at: 0, of: 0, running: false }); }, [videoId]);

  // The page never loaded at all: the API script hung, or the web view never
  // painted. Nothing is reported in that case, so a deadline is the only
  // signal there is.
  useEffect(() => {
    if (ready) return undefined;
    const t = setTimeout(() => giveUp('timeout'), READY_DEADLINE_MS);
    return () => clearTimeout(t);
  }, [ready, giveUp]);

  // The page loaded but the video never started, and the load deadline above
  // has already been cleared by `ready`. Without this the viewer is left
  // looking at a black rectangle with no spinner and no way forward.
  useEffect(() => {
    if (!ready || playedOnce || !playing) return undefined;
    const t = setTimeout(() => giveUp('never started'), PLAY_DEADLINE_MS);
    return () => clearTimeout(t);
  }, [ready, playedOnce, playing, giveUp]);

  const send = useCallback((cmd, value) => {
    try {
      webRef.current?.injectJavaScript(
        `window.__cmd && window.__cmd(${JSON.stringify(cmd)}, ${JSON.stringify(value ?? null)}); true;`
      );
    } catch {}
  }, []);

  // Closing the sheet pauses, reopening resumes. injectJavaScript rather than
  // postMessage: the WebView's postMessage dispatches on `document`, which a
  // listener on `window` never sees.
  useEffect(() => {
    if (!ready) return;
    send(playing ? 'play' : 'pause');
  }, [playing, ready, send]);

  const onMessage = useCallback((e) => {
    let msg = null;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    switch (msg?.t) {
      case 'ready':
        setReady(true);
        onReady?.();
        break;
      case 'playing':
        setPlayedOnce(true);
        setMuted(false);
        break;
      case 'playingMuted':
        setPlayedOnce(true);
        setMuted(true);
        break;
      case 'time':
        if (msg.d) {
          setClock({
            at: Number(msg.d.at) || 0,
            of: Number(msg.d.of) || 0,
            running: !!msg.d.playing,
          });
        }
        break;
      case 'ended':
        onEnd?.();
        break;
      case 'error': {
        const fault = CONFIG_ERRORS.includes(Number(msg.d)) || msg.d === 'api';
        giveUp(msg.d === 'api' ? 'youtube api script' : `youtube ${msg.d}`, fault);
        break;
      }
      default:
        break;
    }
  }, [onEnd, onReady, giveUp]);

  // The embed iframe and the API script are loads the page asks for and must
  // go through. A top level navigation only happens when the viewer taps the
  // video title, the channel avatar or "Watch on YouTube", and that is
  // exactly the hand-off we refuse: the tutorial stays in Biblely.
  const onShouldStartLoadWithRequest = useCallback((req) => {
    const url = req?.url || '';
    if (!url || url === 'about:blank') return true;
    if (req.isTopFrame === false) return true;
    if (req.navigationType === 'click') return false;
    return !/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\/(watch|channel|user|@|playlist|results)/i.test(url);
  }, []);

  if (!videoId) return null;

  if (!WebView) {
    return <VideoUnavailable width={width} height={height} videoId={videoId} message="Update the app to watch tutorials here." />;
  }

  return (
    <PlayerBoundary
      onFail={() => onUnplayable?.('render failed', true)}
      fallback={<VideoUnavailable width={width} height={height} videoId={videoId} message="Update the app to watch tutorials here." />}
    >
      <View style={[styles.box, { width, height }]}>
        <WebView
          ref={webRef}
          source={{ html, baseUrl: EMBED_ORIGIN }}
          originWhitelist={['*']}
          style={[styles.webView, { width, height }]}
          containerStyle={{ width, height }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          allowsPictureInPictureMediaPlayback={false}
          allowsLinkPreview={false}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          androidLayerType="hardware"
          automaticallyAdjustContentInsets={false}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onOpenWindow={() => {}}
          onMessage={onMessage}
          renderError={() => null}
          onError={() => giveUp('webview error')}
          onHttpError={() => giveUp('http error')}
          onContentProcessDidTerminate={() => giveUp('content process gone')}
        />
        {ready ? (
          <PlayerChrome
            width={width}
            height={height}
            playing={clock.running}
            at={clock.at}
            of={clock.of}
            onToggle={() => send('toggle')}
            onSeek={(seconds) => { setClock((c) => ({ ...c, at: seconds })); send('seek', seconds); }}
          />
        ) : null}
        {!ready ? (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
        {ready && muted ? (
          <TouchableOpacity
            onPress={() => { send('unmute'); setMuted(false); }}
            activeOpacity={0.8}
            style={styles.soundPill}
            accessibilityRole="button"
            accessibilityLabel="Turn the sound on"
          >
            <Ionicons name="volume-mute" size={14} color="#fff" />
            <Text style={styles.soundText} allowFontScaling={false}>Sound</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </PlayerBoundary>
  );
};

export default ExerciseVideoPlayer;

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // A hair under 1 keeps WebView's compositor from flashing on first paint.
  webView: { backgroundColor: '#000', opacity: 0.99 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  soundPill: {
    position: 'absolute',
    right: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  soundText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  unavailableText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  linkPill: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  linkText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
