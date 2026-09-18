/**
 * Legal Screen
 *
 * Privacy Policy / Terms of Service / Support & FAQ / Bible Translation
 * Credits, presented as a native-stack modal sheet so it pulls down to dismiss
 * like the rest of the app's sheets. It was an RN <Modal presentationStyle=
 * "pageSheet">, whose interactive swipe-down dismisses the native view without
 * telling React, leaving the state that drives `visible` stuck true.
 *
 * Params: { kind: 'privacy' | 'terms' | 'support' | 'bibleCredits' }
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const TITLES = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  bibleCredits: 'Bible Translation Credits',
  support: 'Support & FAQ',
};

const ICONS = {
  privacy: 'privacy-tip',
  terms: 'description',
  bibleCredits: 'menu-book',
  support: 'help-outline',
};

const LegalScreen = ({ navigation, route }) => {
  const { isDark } = useTheme();
  const kind = route?.params?.kind || 'support';

  const close = () => {
    hapticFeedback.medium();
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F0F23' : '#FAFAFA' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 16, paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        backgroundColor: isDark ? '#0F0F23' : '#FAFAFA',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name={ICONS[kind]} size={22} color={isDark ? '#A5B4FC' : '#6366F1'} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#FFF' : '#1a1a2e', marginLeft: 10 }}>
            {TITLES[kind]}
          </Text>
        </View>
        <TouchableOpacity onPress={close} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="close" size={18} color={isDark ? '#FFF' : '#333'} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {kind === 'privacy' && (
            <>
              <Text style={{ fontSize: 12, color: isDark ? '#888' : '#999', marginBottom: 20 }}>Last updated: 19 September 2026</Text>
              <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22, marginBottom: 16 }}>
                Biblely, developed and operated by Jason ("we", "our", or "the app"), is a faith, fitness and productivity companion available at biblely.uk. Your privacy matters to us. This policy explains what data we collect, how we use it, who receives it, and your rights. Biblely has no social features: there is no feed, no friend list, no messaging between users and no leaderboard. Nothing you create in the app is shown to other users.
              </Text>

              {[
                { title: '1. Data We Collect', content: '1.1 Account Information\nWhen you create an account we collect your email address, a display name, a username and a password. Sign-in is by email or username plus password, handled by Firebase Authentication. We do not ask for your age or gender at sign-up. You can pick a preset avatar or, once your email is verified, upload a custom profile photo. You can choose a country from a list in your profile; this is not taken from your location. During onboarding you may tell us how you heard about Biblely and what you want help with. Your account record also holds your email verification status, two-factor setting, referral details, join and last-active dates and a notification token (see 1.6).\n\n1.2 Content You Create\nPrayers and prayer completion history, prayer boards (folders, envelopes, stickers, photos, backgrounds and layouts), journal entries, verse notes, bookmarks, highlights, saved verses and recent Bible searches, to-do items and schedules, visions (life goals), habits and check-ins, relapse journal notes, reminders and day templates, workout logs, workout templates and split plans, custom exercises, food logs and favourite meals.\n\n1.3 Health and Fitness Data\nWorkout history (sets, reps, weights), split plans, available equipment, scheduled workouts, physique scores (calculated on your device from your workout history), your nutrition profile (gender, age, height, weight, body fat percentage, target weight, goal and activity level), daily food log, food favourites, manual weigh-ins and body composition estimates (BMI, body fat, muscle mass, visceral fat, body water and body age, all formula based). Biblely does not read Apple Health and does not connect to Bluetooth scales. This data is used only to provide the fitness and nutrition features. Relevant parts of it are included in requests to the AI providers in Section 4 when you use Coach, the nutrition plan, smart workout generation or physique feedback.\n\n1.4 Chat and Voice Data\nMessages you send to Guide (the Bible chat) and Coach (the fitness chat) are sent to the AI providers in Section 4 to generate a reply. Guide chat history is kept on your device and in your Firebase account record; Coach chat history stays on your device. If you use voice input, a short recording from your microphone is sent to a speech-to-text provider (Section 4) and turned into text. We do not store the recordings. If you attach a photo of text in Guide, the image is sent to OCR.space to extract the text.\n\n1.5 Usage and Progress Data\nStreaks, points, level, achievement progress, quiz scores, Bible timeline, map and character progress, counts of prayers, workouts and tasks completed, and daily AI usage counters (used to apply fair-use limits). This is used for achievements, streaks and personalisation. It is not shown to other users and there are no leaderboards.\n\n1.6 Notifications and Device Information\nReminders (prayers, tasks, habits, visions, reminders, workouts, weigh-ins, streaks and achievements) are scheduled locally on your device. When you sign in, an Expo push token is generated and stored in your account record. We do not currently send remote push notifications. We check whether the app is running on a real device and read your device language. We do not collect advertising identifiers or device identifiers for tracking.\n\n1.7 Photos and Camera\nIf you use the camera or photo library, images are used for your profile photo, food photos, Coach gym photos, prayer boards, or text extraction in Guide. Food and gym photos are sent to Google Gemini for analysis and are not stored on our servers. A custom profile photo is uploaded to Firebase Storage exactly as you chose it. It is not sent to any AI service and is not scanned or analysed. Prayer-board photos are stored in Firebase Storage. Barcode scanning sends only the barcode number to Open Food Facts. The Habits "Emergency" screen uses the front camera as a mirror; nothing is recorded or sent. Share cards and prayer-board images are saved to your photo library only when you choose to save them.\n\n1.8 Calendar Data\nIf you turn on calendar sync in Settings, Biblely writes your prayers, reminders, tasks, workouts and day-template blocks to a "Biblely" calendar and a "Biblely Work" calendar on your iPhone. My Week also reads events from your other iPhone calendars so it can show them and let you move them. Calendar data stays on your device and in your own calendar accounts. It is not sent to our servers. If you use "Make it fit" in My Week, the titles and times of the items being replanned are sent to the AI providers in Section 4.\n\n1.9 Weather\nMy Week can show a weather line. You type a city name; it is sent to Open-Meteo to look up coordinates, and the forecast for those coordinates is fetched from Open-Meteo and cached for 45 minutes. The city name is stored only on your device. Biblely never asks for or uses your device location.\n\n1.10 Preferences\nTheme, dark mode, wallpaper, app icon, loading and streak animations, tab bar and card layout, notification settings and alert style, calendar sync setting, units, Bible version, reading voice and language. Theme, dark mode, wallpaper, loading and streak animations, notification preferences, Bible version and units sync through Firebase. Only Bible version and units are also backed up to iCloud. App icon, tab bar and card layout, calendar sync setting, alert style and reading voice stay on your device.\n\n1.11 Referral Data\nIf you enter the username of the person who invited you, we record that link on your account and add one to their referral count. Referral counts unlock cosmetic items only.' },
                { title: '2. How We Use Your Data', content: '\u2022 To provide and personalise app features (Bible reading, prayers, prayer boards, journal, tasks, visions, habits, reminders, My Week, workouts, nutrition and physique tracking)\n\u2022 To sync your data across your devices through Firebase and iCloud\n\u2022 To schedule the local reminders you turn on\n\u2022 To generate chat replies, verse explanations, prayer reflections, task scores, workout and nutrition plans, physique feedback and schedule suggestions using the AI providers in Section 4\n\u2022 To turn voice input into text and to read text aloud\n\u2022 To extract text from photos you attach in Guide\n\u2022 To estimate nutrition from food photos and barcodes\n\u2022 To show a forecast for a city you type in\n\u2022 To mirror your plans to your iPhone calendar when you turn on calendar sync\n\u2022 To track streaks, points, levels and achievements\n\u2022 To apply daily fair-use limits on AI features\n\u2022 To send email verification, password reset and two-factor codes\n\u2022 To open YouTube searches for exercise tutorials (the app sends nothing to YouTube)' },
                { title: '3. Data Storage and Retention', content: '3.1 On Your Device\nYour data is stored locally so the app works offline. Completed tasks, prayer completion history, quiz history, food logs and workout history older than 90 days are removed automatically, on the device and in the cloud. Bible text is cached for up to 30 days for offline reading, and generated audio is cached on your device so it can be replayed without a new request.\n\n3.2 Cloud Storage (Firebase)\nYour data is synced to Google Firebase (Firestore) servers in the United States so you can use more than one device. Profile photos and prayer-board images are stored in Firebase Storage. Cloud data is kept for as long as your account exists. When you delete your account, all of it is removed.\n\n3.3 iCloud\nWhen your iPhone is signed into iCloud, Biblely also backs up part of your data to your private iCloud container automatically: verse notes and highlights, saved verses, journal entries, reading streaks, achievements, highlight names, to-dos and completed to-dos, points, level and stats, Bible version, units, prayer history and completions, your profile, app settings and the onboarding flag. Day templates, custom exercises, available equipment and Coach chat history stay on the device only. That container belongs to your Apple ID and we cannot read it. Biblely has no in-app switch for this; you can turn iCloud off for Biblely in your iPhone\'s iCloud settings. iCloud data is purged when you delete your account.\n\n3.4 Widgets\nHome screen widgets read a local copy of your data through an app group on your device. Nothing leaves the device.' },
                { title: '4. Third-Party Services', content: '\u2022 Google Firebase (United States): sign-in, cloud database, file storage for profile and prayer-board images, and server functions for email codes, referral handling and AI usage limits\n\u2022 Apple: iCloud and CloudKit sync, Calendar (when calendar sync is on, plus reading your calendars in My Week), Photos, Maps for the Bible maps (no user location), home screen widgets and the App Store review prompt\n\u2022 AI text providers: Groq, Cerebras, SambaNova, DeepSeek, OpenRouter (which routes to Meta Llama, Google Gemma, Mistral and DeepSeek models), Mistral AI and Google Gemini. Requests move to the next provider when one is unavailable. Depending on the feature they receive chat messages, your display name (used to greet you), verse and prayer text, task text, schedule items, body and nutrition numbers and workout summaries. DeepSeek is operated by a company based in the People\'s Republic of China, and data sent to it may be processed in China.\n\u2022 Speech-to-text: Groq (Whisper), Mistral AI (Voxtral), Google Gemini and Google Cloud Speech-to-Text receive the voice recordings from chat voice input\n\u2022 Google Gemini: food photo analysis and Coach gym photo analysis. If you type a food name instead of taking a photo, that text is sent to Google Gemini to estimate its nutrition\n\u2022 Google Cloud Text-to-Speech: verse, prayer and chat text for audio playback\n\u2022 OCR.space: text extraction from photos attached in Guide\n\u2022 Open Food Facts: barcode lookups (barcode number only)\n\u2022 Open-Meteo: city name lookup and weather forecast for My Week\n\u2022 Resend: verification, password reset and two-factor emails sent from noreply@biblely.uk\n\u2022 Expo push notification service: creates the notification token stored on your account\n\u2022 GitHub: Bible translations, quiz questions, character profiles and audio stories (only the file name is sent)\n\u2022 YouTube: exercise tutorial searches opened in your browser\n\u2022 EyeCandy (a separate app by the same developer): if installed, it can ask Biblely to move a prayer or reminder through an on-device link. You confirm each request. Nothing is sent over the internet.' },
                { title: '5. International Data Transfers', content: 'Your data may be processed outside your country, including:\n\n\u2022 United States: Google (Firebase, Gemini, Cloud Speech-to-Text and Text-to-Speech), Groq, Cerebras, SambaNova and OpenRouter\n\u2022 European Union: Mistral AI (France)\n\u2022 People\'s Republic of China: DeepSeek\n\nOther providers in Section 4 may process requests in the United States or the European Union. We rely on the data protection practices of each provider and send only what the feature needs.' },
                { title: '6. Data Sharing', content: 'We do not sell, rent or share your personal data with third parties for marketing or advertising. Data goes only to the services in Section 4, and only to provide app features. No Biblely feature shows your data to other users.' },
                { title: '7. Analytics and Tracking', content: 'We do not use any analytics or tracking SDKs. We do not track you across apps or websites. No advertising identifiers are collected.' },
                { title: '8. Your Rights', content: 'Access: You can view most of your data within the app. Contact us at the email below for a full copy of your account record.\n\nRectification: You can correct or update your personal information in the Profile and Settings screens.\n\nDeletion: You can delete your account and all associated data from Settings > Delete Account. This removes your data from Firebase, Firebase Storage, iCloud and your device.\n\nPortability: Your data is stored on your device and is included in standard device backups.\n\nFor users in the European Economic Area and the United Kingdom (GDPR): We process your personal data on the basis of contract performance, consent and legitimate interest. You have the right to lodge a complaint with your local data protection authority.\n\nFor California residents (CCPA): You have the right to know what personal information we collect, to request deletion, and to opt out of the sale of personal information. We do not sell your personal information.' },
                { title: '9. Children\'s Privacy', content: 'Biblely is not directed at children under 13. We do not knowingly collect personal data from children under the age of 13. If we discover that we have inadvertently collected data from a child under 13, we will promptly delete that data.' },
                { title: '10. Security', content: 'We use Firebase Authentication, encrypted connections (HTTPS/TLS) and Firebase\'s password hashing. Email verification, password reset and optional two-factor sign-in all use 6-digit codes sent to your email address. All data sent to the services in Section 4 travels over encrypted connections.' },
                { title: '11. Changes to This Policy', content: 'We may update this privacy policy from time to time. We will notify you of significant changes through the app or by updating the "Last updated" date at the top of this page.' },
                { title: '12. Contact', content: 'If you have questions about this privacy policy, your data, or wish to exercise any of your rights, contact us at:\n\nbiblelyios@gmail.com\nbiblely.uk' },
              ].map((section, i) => (
                <View key={i} style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#A5B4FC' : '#6366F1', marginBottom: 8 }}>{section.title}</Text>
                  <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22 }}>{section.content}</Text>
                </View>
              ))}
            </>
          )}

          {kind === 'terms' && (
            <>
              <Text style={{ fontSize: 12, color: isDark ? '#888' : '#999', marginBottom: 20 }}>Last updated: 19 September 2026</Text>
              <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22, marginBottom: 16 }}>
                Welcome to Biblely. By using the app, you agree to these Terms of Service. If you do not agree, please do not use the app.
              </Text>

              {[
                { title: '1. Description of Service', content: 'Biblely is a faith, fitness and productivity companion app that provides:\n\n\u2022 Faith: Bible reading with 44 translations, saving, highlighting, bookmarks, notes, share cards and audio playback; Bible Study tools (characters with audio stories, quiz, mini-games, timeline, maps, thematic guides, key verses and fast facts); Guide, a Bible chat with text, voice and photo input; daily prayers with reminders and reflections; prayer boards with folders, envelopes, stickers, photos and backgrounds; and a journal\n\u2022 Focus: a to-do list with task scoring, scheduled tasks and calendar views, visions (life goals), habits with check-ins and support tools, reminders, and My Week, a day planner that can include your iPhone calendar events, day templates, a weather line and "Make it fit" replanning\n\u2022 Fitness: workout logging with sets, reps and weights, templates and folders, smart workout generation, a 900+ exercise library with YouTube tutorial links, scheduled workouts, a physique body map with muscle scores and coach feedback, and body composition estimates\n\u2022 Nutrition: food logging with photo scanning and barcode lookup, calorie and macronutrient tracking, favourite meals, personalised daily targets and nutrition plans\n\u2022 Coach: a fitness chat with text, voice and gym photo input\n\u2022 Customisation: 25+ themes, alternate app icons, loading and streak animations, tab bar and card layout, and reading voices\n\u2022 Achievements: points, levels, streaks and badges across all features\n\u2022 Calendar sync to your iPhone calendar and home screen widgets\n\nThe app is free with no subscriptions, in-app purchases or ads. Some cosmetic items unlock through referrals.' },
                { title: '2. Eligibility and Account Registration', content: 'You must be at least 13 years of age to use Biblely, or older if the law where you live sets a higher age for consenting to data processing. If you are under 18, you represent that you have your parent\'s or legal guardian\'s permission to use the app.\n\nAn account with a valid email address is required to use Biblely. Features that use external AI services (Guide, Coach, food photos, generated plans, voice input and cloud reading voices) additionally require a verified email address. So do the referral system, custom profile photos and two-factor sign-in. AI features are subject to daily fair-use limits. You are responsible for keeping your credentials confidential and for all activity under your account.' },
                { title: '3. Acceptable Use', content: 'You agree not to:\n\n\u2022 Use the app for any unlawful purpose\n\u2022 Use offensive, hateful or inappropriate words or images in your username, display name or profile photo\n\u2022 Attempt to interfere with or disrupt the app\'s services, or to bypass its usage limits\n\u2022 Create multiple accounts for deceptive purposes\n\u2022 Scrape, copy or redistribute Bible translations or app content\n\u2022 Exploit the referral system through fraudulent or deceptive means' },
                { title: '4. Your Content and Moderation', content: 'You retain ownership of everything you create in the app (prayers, journal entries, tasks, prayer boards, chat messages, workout and nutrition data). Biblely has no social features, so nothing you create is shown to other users, and we claim no licence to display your content to anyone. Your content is processed only to provide app features, which includes sending it to the services in Section 9 when a feature needs them. You can delete your content at any time and delete your account from Settings.\n\nUsernames, display names and text you add to calendar tasks pass through an automated profanity filter. Custom profile photos are not scanned or sent to any AI service. We may suspend accounts that use offensive names or images or that misuse the service.' },
                { title: '5. Bible Content', content: 'Bible translations available in the app are provided for personal, non-commercial use only. You may not redistribute, sell, or commercially use Bible text obtained through the app. Bible quiz questions, timeline content, character profiles, and map data are provided for educational and personal reflection purposes.' },
                { title: '6. Automated Content and Disclaimer', content: 'Biblely uses external AI services (Groq, Cerebras, SambaNova, DeepSeek, OpenRouter, Mistral AI and Google Gemini) to generate certain content within the app. This includes:\n\n\u2022 Guide and Coach chat replies\n\u2022 Bible verse explanations, simplified verses and prayer reflections\n\u2022 Nutrition plans, dietary suggestions and calorie estimates from food photos\n\u2022 Workout plans based on your split, available equipment and physique data\n\u2022 Physique coaching feedback and gym photo analysis\n\u2022 Task priority scoring\n\u2022 Schedule suggestions from "Make it fit" in My Week\n\nPhysique scores and body composition estimates (BMI, body fat, muscle mass, visceral fat, body water and body age) are calculated on your device from formulas and your own entries.\n\nGenerated content may contain errors, inaccuracies or omissions. Do not rely on it alone for important decisions about your health, diet, fitness or spiritual life.' },
                { title: '7. Bible Interpretation Disclaimer', content: 'Bible verse explanations, study notes, quiz explanations, character profiles, timeline descriptions, and interpretive content provided within the app are intended for personal reflection and educational purposes only. Some of this content is prepared in advance and some is generated by the AI services above. This content does not constitute pastoral counselling, theological advice, or doctrinal instruction.' },
                { title: '8. Health and Fitness Disclaimer', content: 'Biblely provides workout tracking, nutrition tracking, physique scoring, and body composition estimates for informational and wellness purposes only. These features are NOT medical advice and should not be used as a substitute for professional medical advice, diagnosis, or treatment.\n\nPhysique scores and muscle group ratings are calculated from your self-reported workout history and are intended to help you track relative progress over time. They are not clinical assessments. Weigh-ins are entered by hand; Biblely does not connect to scales or Apple Health.\n\nExercise tutorial videos linked from the app are hosted on YouTube by third-party creators. We do not produce, verify, or endorse the content of these videos.\n\nAlways consult a healthcare professional before making significant changes to your diet or exercise routine.' },
                { title: '9. Third-Party Services', content: 'Biblely relies on third-party services to deliver its features:\n\n\u2022 Google Firebase: sign-in, cloud database, file storage and server functions\n\u2022 Apple: App Store terms, iCloud sync, Calendar, Photos, Maps and home screen widgets\n\u2022 AI providers: Groq, Cerebras, SambaNova, DeepSeek, OpenRouter, Mistral AI and Google Gemini\n\u2022 Speech-to-text: Groq, Mistral AI, Google Gemini and Google Cloud Speech-to-Text\n\u2022 Google Cloud Text-to-Speech: audio playback\n\u2022 OCR.space: text extraction from photos\n\u2022 Open Food Facts: barcode lookups\n\u2022 Open-Meteo: weather for My Week\n\u2022 GitHub: Bible, quiz, character and audio data\n\u2022 Resend: verification and security emails\n\u2022 Expo: notification token service\n\u2022 YouTube: exercise tutorial search links\n\nWe are not responsible for the availability, accuracy, or policies of third-party services.' },
                { title: '10. Intellectual Property', content: 'The app, its design, code, graphics, themes, and non-Bible content are owned by Biblely. You may not copy, modify, distribute, or reverse engineer the app or its components.' },
                { title: '11. Account Termination', content: 'You may delete your account at any time through Settings > Delete Account. We reserve the right to suspend or terminate accounts that violate these terms. When your account is deleted, your data is removed from our servers, from Firebase Storage and from your iCloud container.' },
                { title: '12. Limitation of Liability', content: 'The app is provided "as is" without warranties of any kind, either express or implied. To the fullest extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the app.' },
                { title: '13. Indemnification', content: 'You agree to indemnify, defend, and hold harmless Biblely, its developer, and any affiliates from and against any claims, liabilities, damages, losses, costs, and expenses arising out of your use of the app, your violation of these Terms, or your violation of any rights of another person or entity.' },
                { title: '14. Dispute Resolution', content: 'If you have a problem with the app, please contact us first at the email below so we can try to sort it out informally. Any dispute arising out of or relating to these Terms that we cannot resolve that way will be dealt with by the courts of England and Wales.\n\nIf you live in another country, nothing in this section removes rights you have as a consumer under the mandatory laws of that country, including any right to bring a claim in your own local courts.' },
                { title: '15. Changes to Terms', content: 'We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.' },
                { title: '16. Governing Law', content: 'These Terms of Service are governed by the laws of England and Wales. If you live in another country, you also keep the protection of any mandatory consumer laws there.' },
                { title: '17. Contact', content: 'If you have questions about these terms, contact us at:\n\nbiblelyios@gmail.com' },
              ].map((section, i) => (
                <View key={i} style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#A5B4FC' : '#6366F1', marginBottom: 8 }}>{section.title}</Text>
                  <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22 }}>{section.content}</Text>
                </View>
              ))}
            </>
          )}

          {kind === 'support' && (
            <>
              <Text style={{ fontSize: 14, color: isDark ? '#999' : '#666', marginBottom: 24 }}>
                Welcome to Biblely Support. Below you'll find answers to the most frequently asked questions. If your question isn't covered here, please email us at biblelyios@gmail.com.
              </Text>

              {[
                // Getting Started
                { q: 'How do I create an account?', a: 'Open Biblely and tap "Sign Up". Enter your email address, display name, username and a password. You will receive a 6-digit code by email; enter it to verify your address. Your account syncs your data across devices. A verified email is also needed for Guide, Coach and the other features that use external AI services.' },
                { q: 'Is Biblely free?', a: 'Yes. Biblely is completely free to use with no subscriptions, no in-app purchases, and no ads. All features are available to every user. Some themes, loading animations, share-card backgrounds and reading voices can be unlocked through the referral system.' },
                { q: 'How does data sync work?', a: 'Your data is stored locally on your device and automatically synced to the cloud via Firebase. This means your data is available even when you are offline. When you reconnect, changes are synced automatically. If your iPhone is signed into iCloud, Biblely also backs up part of your data (verses, notes, journal, streaks, to-dos, stats, prayers, profile and settings) to your private iCloud container.' },
                { q: 'How do I delete my account?', a: 'Go to Settings (via your Profile tab) and tap "Delete Account". This permanently removes all your data from our servers, from iCloud and from your device. This action cannot be undone.' },
                // Bible
                { q: 'How many Bible translations are available?', a: 'Biblely offers 44 English translations. You can switch translations at any time from the Bible reader. Translation data is downloaded and cached locally for offline reading.' },
                { q: 'Can I listen to the Bible?', a: 'Yes. The Bible reader includes a text-to-speech feature that reads passages aloud. You can choose from a selection of voice styles. Audio is generated using Google Cloud Text-to-Speech and cached locally so you can listen offline after the first playback.' },
                { q: 'How do I save or highlight verses?', a: 'While reading, tap on a verse to select it. You will see options to save, highlight (with multiple colour choices), bookmark, or add a personal note. All saved verses are accessible from the "Saved Verses" screen.' },
                { q: 'What is Guide?', a: 'Guide is the Bible chat. You can ask questions about Bible passages, request explanations, or talk through what you are reading. It supports text, voice input and photos of text. Guide needs an internet connection and a verified email address.' },
                { q: 'What is the Bible Quiz?', a: 'The Bible Quiz lets you test your knowledge across 15 categories, including New Testament, Old Testament, Life of Jesus, Miracles, Parables, Women of the Bible, Prophets and Heroes of Faith. Questions range from beginner to advanced difficulty and earn you points toward achievements.' },
                { q: 'What are Bible Timeline, Maps, and Characters?', a: 'These are interactive study tools. The Timeline lets you explore key Biblical events in chronological order. Maps show the geographical locations of Biblical events on Apple Maps. Characters provides detailed profiles of important people in the Bible, with audio stories.' },
                // Prayer
                { q: 'What are Prayer Boards?', a: 'Prayer Boards are visual, customisable boards where you can organise your prayers creatively. You can create multiple boards, each with its own title and background colour or custom background image. Within each board, you can add folders, envelopes, stickers, and photos.' },
                { q: 'How do I customise a Prayer Board?', a: 'Open a prayer board and use the editing tools to add folders, envelopes, stickers, and photos. You can change the board\'s background colour or set a custom background image. Tap the title to rename it. You can also save your board as an image.' },
                { q: 'Can I delete a Prayer Board?', a: 'Yes. Open the board you want to delete and use the delete option. This permanently removes the board and all its contents.' },
                { q: 'How do prayer reminders work?', a: 'Open Notification Settings from your Profile and turn on Prayer Reminders. By default, Biblely sends a local notification 30 minutes before each prayer time; you can change this for each prayer. You can also choose an alert style and a notification sound.' },
                { q: 'How do I set my profile picture?', a: 'You can choose from 23 preset avatar images or use your initials as your avatar. Go to your Profile tab, tap "Edit Profile", and select an avatar from the grid.' },
                { q: 'Can I upload my own profile photo?', a: 'Yes, but only if your email address is verified. Once verified, you will see an "Upload Your Own Photo" button below the preset avatars. Your photo is used exactly as you chose it. It is not scanned or sent to any AI service.' },
                // Fitness
                { q: 'How do I log a workout?', a: 'Go to the Fitness tab and start a new workout. You can choose from the exercise library (900+ exercises), use a pre-built template, or generate a smart workout. During the workout, log your sets, reps, and weights for each exercise.' },
                { q: 'How do I set up my workout split?', a: 'Go to the Fitness tab and open your workout split settings. You can assign muscle groups to each day of the week, set the number of exercises per day, and specify how many exercises per muscle group.' },
                { q: 'How do I select my available equipment?', a: 'In the workout split settings, you will find an "Available Equipment" section. Select the equipment you have access to (e.g., dumbbells, barbell, Smith machine, cables, resistance bands). The smart workout generator will only suggest exercises using your selected equipment.' },
                { q: 'What is the Physique / Body Map feature?', a: 'The Body Map is a visual representation of your muscle development. Based on your workout history, each muscle group is scored and colour-coded to show your relative development. Scores are calculated on your device. It also provides balance suggestions for undertrained areas.' },
                { q: 'How do exercise tutorial videos work?', a: 'When browsing the exercise library or during an active workout, you will see a play button next to each exercise. Tapping it opens a YouTube search for that exercise\'s form tutorial. These videos are hosted by third-party creators on YouTube.' },
                { q: 'What is the Coach?', a: 'The Coach is a fitness chat that provides personalised guidance. You can ask about exercise form, nutrition, workout programming, or send a gym photo for analysis and feedback. It supports both text and voice input.' },
                // Nutrition
                { q: 'How does food scanning work?', a: 'Tap the camera button in the Nutrition section. Take a photo of your meal and the app will estimate its calories, protein, carbs, and fat. You can also scan a product barcode to look it up on Open Food Facts. You can edit the values before saving. For better accuracy: use good lighting and photograph the food clearly from above.' },
                { q: 'How are my calorie targets calculated?', a: 'Your targets are calculated based on your height, weight, age, gender, and activity level using the Mifflin-St Jeor equation for Total Daily Energy Expenditure (TDEE). You can adjust your target based on your goal (lose weight, maintain, or gain weight).' },
                { q: 'How accurate are nutritional estimates from food photos?', a: 'Nutritional estimates from food photos are approximations. They may vary from actual nutritional values. For precise dietary tracking or medical dietary requirements, we recommend using verified nutritional databases or consulting a registered dietitian.' },
                // Tasks
                { q: 'How does task scoring work?', a: 'When you add a task, the app analyses its complexity and assigns it a point value. Quick tasks earn fewer points, while complex or time-intensive tasks earn more. Complete tasks to build your streak and earn points.' },
                { q: 'Can I schedule tasks for future dates?', a: 'Yes. Tap the calendar icon when creating or viewing a task to pick a specific date. Tasks are organised by date with the closest deadlines shown first.' },
                { q: 'What is My Week?', a: 'My Week shows your prayers, reminders, tasks and workouts on one day timeline, together with events from your iPhone calendar. You can move items to new times, apply day templates and see a weather line for a city you type in. Biblely never uses your device location.' },
                { q: 'How does calendar sync work?', a: 'Turn on calendar sync in Settings. Biblely then writes your prayers, reminders, tasks, workouts and day-template blocks to a "Biblely" calendar and a "Biblely Work" calendar on your iPhone so they appear alongside your other events. You can pick a default alarm time. Turning sync off in Settings deletes the Biblely and Biblely Work calendars and the events Biblely wrote to them.' },
                // Customisation
                { q: 'How many themes are available?', a: 'Biblely offers 25+ themes ranging from light and dark modes to unique visual styles with custom wallpapers and colour palettes. Some themes are available to all users, while others can be unlocked through the referral system.' },
                { q: 'What are loading animations?', a: 'You can choose from different loading animations (Default, Running Cat, or Run Hamster) to personalise how the app looks while content is loading. Select your preferred animation in the Customisation settings.' },
                // Referrals & Achievements
                { q: 'How does the referral system work?', a: 'Referrals work by username. If someone told you about Biblely, enter their username under "Referred By" in Settings. This can be set once, and both accounts need a verified email. Each referral raises that person\'s referral count, which unlocks themes, loading animations, share-card backgrounds and reading voices. No money is involved.' },
                { q: 'What are achievements?', a: 'Achievements are badges you earn by reaching milestones across all app features, such as completing workouts, maintaining prayer streaks, finishing Bible quizzes, logging food, and completing tasks. Each achievement awards points that contribute to your level.' },
                // Privacy & Data
                { q: 'Is my data private?', a: 'Yes. We do not sell or share your data with third parties for marketing. We do not use analytics or tracking SDKs. Biblely has no social features, so nothing you create is shown to other users. Your data is only used to provide app features. See our Privacy Policy for full details.' },
                { q: 'Does the app work offline?', a: 'Yes. Core features work offline since your data is stored locally. Bible translations are cached for offline reading. Features that require an internet connection include cloud sync, Guide and Coach chat, food photo and barcode scanning, weather, and text-to-speech audio generation (on first playback).' },
                { q: 'My data isn\'t syncing across devices.', a: 'Ensure you have an active internet connection. Data syncs automatically when the app is open and connected. If sync seems stuck, try closing and reopening the app. Check that you are signed into the correct account.' },
                // Troubleshooting
                { q: 'The app isn\'t loading or is stuck on a loading screen', a: 'Try closing the app completely and reopening it. If the problem persists, check your internet connection. As a last resort, delete and reinstall the app. Your data will be restored from the cloud once you sign back in.' },
                { q: 'Notifications aren\'t working', a: 'Check that you have enabled notifications for Biblely in your iPhone\'s Settings > Notifications > Biblely. Within the app, ensure the specific notification types you want are turned on. If notifications still do not arrive, try signing out and signing back in.' },
                { q: 'How do I report a bug or suggest a feature?', a: 'Email us at biblelyios@gmail.com. We read every message and appreciate your feedback. Include as much detail as possible so we can help quickly.' },
              ].map((faq, i) => (
                <View key={i} style={{
                  marginBottom: 16, padding: 16, borderRadius: 14,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF',
                  borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
                  borderColor: 'rgba(0,0,0,0.06)',
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#FFF' : '#1a1a2e', marginBottom: 8 }}>{faq.q}</Text>
                  <Text style={{ fontSize: 14, color: isDark ? '#AAA' : '#555', lineHeight: 21 }}>{faq.a}</Text>
                </View>
              ))}

              <View style={{
                marginTop: 12, padding: 20, borderRadius: 16,
                backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#EDE9FE',
              }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#A5B4FC' : '#6366F1', marginBottom: 8 }}>Contact Us</Text>
                <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22 }}>
                  Email: biblelyios@gmail.com{'\n\n'}We typically respond within 48 hours.
                </Text>
              </View>
            </>
          )}

          {kind === 'bibleCredits' && (
            <>
              <Text style={{ fontSize: 14, color: isDark ? '#999' : '#666', marginBottom: 20, lineHeight: 21 }}>
                Biblely provides Bible text from multiple translations for personal, non-commercial reading. All translations remain the intellectual property of their respective copyright holders.
              </Text>

              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#A5B4FC' : '#6366F1', marginBottom: 14 }}>Copyrighted Translations</Text>
              {[
                { abbr: 'NIV', name: 'New International Version', notice: '© Biblica, Inc. All rights reserved worldwide.' },
                { abbr: 'NLT', name: 'New Living Translation', notice: '© Tyndale House Foundation. Used by permission of Tyndale House Publishers.' },
                { abbr: 'ESV', name: 'English Standard Version', notice: '© Crossway, a publishing ministry of Good News Publishers.' },
                { abbr: 'NKJV', name: 'New King James Version', notice: '© Thomas Nelson, Inc.' },
                { abbr: 'NASB', name: 'New American Standard Bible', notice: '© The Lockman Foundation.' },
                { abbr: 'NASB77', name: 'NASB 1977', notice: '© The Lockman Foundation.' },
                { abbr: 'NASB95', name: 'NASB 1995', notice: '© The Lockman Foundation.' },
                { abbr: 'CSB', name: 'Christian Standard Bible', notice: '© Holman Bible Publishers.' },
                { abbr: 'HCSB', name: 'Holman Christian Standard Bible', notice: '© Holman Bible Publishers.' },
                { abbr: 'AMP', name: 'Amplified Bible', notice: '© The Lockman Foundation.' },
                { abbr: 'CEV', name: 'Contemporary English Version', notice: '© American Bible Society.' },
                { abbr: 'GNT', name: 'Good News Translation', notice: '© American Bible Society.' },
                { abbr: 'GWT', name: "God's Word Translation", notice: "© God's Word to the Nations Mission Society." },
                { abbr: 'NRSV', name: 'New Revised Standard Version', notice: '© National Council of the Churches of Christ in the USA.' },
                { abbr: 'NAB', name: 'New American Bible', notice: '© USCCB/Confraternity of Christian Doctrine.' },
                { abbr: 'NET', name: 'NET Bible', notice: '© Biblical Studies Press, L.L.C.' },
                { abbr: 'ISV', name: 'International Standard Version', notice: '© ISV Foundation.' },
                { abbr: 'LSV', name: 'Literal Standard Version', notice: '© Covenant Press. Licensed under CC BY-SA.' },
                { abbr: 'LSB', name: 'Legacy Standard Bible', notice: '© Three Sixteen Publishing.' },
                { abbr: 'ABPE', name: 'Aramaic Bible in Plain English', notice: '© David Bauscher.' },
                { abbr: 'PHBT', name: 'Peshitta Holy Bible Translated', notice: '© Janet M. Magiera.' },
                { abbr: 'LAMSA', name: 'Lamsa Bible', notice: '© A.J. Holman Co.' },
              ].map((item, i) => (
                <View key={i} style={{
                  marginBottom: 10, padding: 14, borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF',
                  borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
                  borderColor: 'rgba(0,0,0,0.06)',
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFF' : '#1a1a2e', marginBottom: 4 }}>{item.abbr}: {item.name}</Text>
                  <Text style={{ fontSize: 13, color: isDark ? '#AAA' : '#555', lineHeight: 19 }}>{item.notice}</Text>
                </View>
              ))}

              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#A5B4FC' : '#6366F1', marginTop: 20, marginBottom: 14 }}>Public Domain Translations</Text>
              <View style={{
                padding: 14, borderRadius: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF',
                borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
                borderColor: 'rgba(0,0,0,0.06)',
                marginBottom: 10,
              }}>
                <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22 }}>
                  The following translations are in the public domain and freely available:{'\n\n'}KJV (King James Version), ASV (American Standard Version), WEB (World English Bible), YLT (Young's Literal Translation), DRB (Douay-Rheims Bible), WBT (Webster's Bible Translation), SLT (Smith's Literal Translation), ERV (English Revised Version), JPS (JPS Tanakh 1917), BSB (Berean Standard Bible), BLB (Berean Literal Bible), MSB (Majority Standard Bible), NHEB (New Heart English Bible), CPDV (Catholic Public Domain Version), LXX (Brenton Septuagint), ANT (Anderson NT), WNT (Weymouth NT), WORRELL (Worrell NT), WORSLEY (Worsley NT), GODBEY (Godbey NT), HAWEIS (Haweis NT), MACE (Mace NT).
                </Text>
              </View>

              <View style={{
                marginTop: 16, padding: 16, borderRadius: 14,
                backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#EDE9FE',
              }}>
                <Text style={{ fontSize: 13, color: isDark ? '#CCC' : '#555', lineHeight: 20 }}>
                  Scripture texts are provided for personal reading and study only, not for redistribution or commercial use. All rights belong to their respective copyright holders. If you are a rights holder and have concerns, please contact us at biblelyios@gmail.com.
                </Text>
              </View>
            </>
          )}
      </ScrollView>
    </View>
  );
};

export default LegalScreen;
