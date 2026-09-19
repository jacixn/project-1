// Loads Biblely's real exercise video page into a real WKWebView on this Mac
// and prints everything the page reports back. WKWebView is the same engine
// the iPhone runs, so this catches the class of failure that only shows up
// inside a web view: a document origin YouTube will not serve an embed to,
// autoplay being refused, a player that never becomes ready.
//
// Driven by scripts/test-exercise-video.js. Not part of the app bundle.
//
//   usage: youtubePageProbe <htmlFile> <baseUrl> [timeoutSeconds]
//
// Prints one "MSG <json>" line per message the page posts through
// window.ReactNativeWebView.postMessage, then "DONE".

import Cocoa
import WebKit

let args = CommandLine.arguments
guard args.count > 2 else {
    FileHandle.standardError.write("usage: youtubePageProbe <htmlFile> <baseUrl> [timeoutSeconds]\n".data(using: .utf8)!)
    exit(2)
}
let htmlPath = args[1]
let baseUrl = args[2]
let timeout = args.count > 3 ? (Double(args[3]) ?? 25) : 25

guard let html = try? String(contentsOfFile: htmlPath, encoding: .utf8) else {
    FileHandle.standardError.write("cannot read \(htmlPath)\n".data(using: .utf8)!)
    exit(2)
}

// The page talks to React Native through window.ReactNativeWebView. Stand in
// for it so the page under test runs completely unmodified.
let shim = """
window.ReactNativeWebView = { postMessage: function(s){ try { window.webkit.messageHandlers.probe.postMessage(String(s)); } catch(e){} } };
window.onerror = function(m){ try { window.webkit.messageHandlers.probe.postMessage(JSON.stringify({t:'jserror', d:String(m)})); } catch(e){} };
"""

final class Probe: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    var web: WKWebView!
    var window: NSWindow?
    let html: String
    let baseUrl: String
    let shim: String
    init(html: String, baseUrl: String, shim: String) {
        self.html = html; self.baseUrl = baseUrl; self.shim = shim
        super.init()
    }
    func start() {
        let cfg = WKWebViewConfiguration()
        cfg.userContentController.add(self, name: "probe")
        cfg.userContentController.addUserScript(
            WKUserScript(source: shim, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        // The iOS app sets mediaPlaybackRequiresUserAction={false}; this is
        // the same switch, so autoplay is tested under the app's own rules.
        cfg.mediaTypesRequiringUserActionForPlayback = []
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: 640, height: 360), configuration: cfg)
        web.navigationDelegate = self
        // WebKit suspends media in a view that is not in a window, so park a
        // real window far off screen rather than testing a suspended player.
        let win = NSWindow(contentRect: NSRect(x: -12000, y: -12000, width: 640, height: 360),
                           styleMask: [.borderless], backing: .buffered, defer: false)
        win.contentView = web
        win.orderBack(nil)
        window = win
        web.loadHTMLString(html, baseURL: URL(string: baseUrl))
    }
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        print("MSG \(m.body)"); fflush(stdout)
    }
    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) {
        print("NAVFAIL \(e.localizedDescription)"); fflush(stdout)
    }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) {
        print("PROVFAIL \(e.localizedDescription)"); fflush(stdout)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let probe = Probe(html: html, baseUrl: baseUrl, shim: shim)
probe.start()
DispatchQueue.main.asyncAfter(deadline: .now() + timeout) {
    print("DONE"); fflush(stdout); exit(0)
}
app.run()
