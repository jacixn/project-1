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
              <Text style={{ fontSize: 12, color: isDark ? '#888' : '#999', marginBottom: 20 }}>Last updated: March 21, 2026</Text>
              <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22, marginBottom: 16 }}>
                Biblely, developed and operated by Jason ("we", "our", or "the app") is a faith, fitness, and productivity companion available at biblely.uk. Your privacy matters to us. This policy explains what data we collect, how we use it, who we share it with, and your rights.
              </Text>

              {[
                { title: '1. Data We Collect', content: '1.1 Account Information\nWhen you create an account, we collect your email address, display name, username, name, age, gender, and profile avatar selection. You can choose from preset avatar images or, if your email is verified, upload a custom profile photo.\n\n1.2 User-Generated Content\nContent you create within the app, including: prayers, prayer boards (including folders/envelopes, stickers, photos, backgrounds, and custom board layouts), journal entries and personal notes attached to Bible verses, to-do items, task descriptions, and task schedules, saved and highlighted Bible verses, bookmarks, and verse notes, workout logs, workout templates, and workout split plans, nutrition data including food logs and favourite meals, social feed posts and direct messages, and custom exercises created by you.\n\n1.3 Health and Fitness Data\nWorkout history, exercise logs (sets, reps, weights), workout split plans (training days, muscle groups, exercise counts), available equipment preferences, nutrition tracking (food logs, calorie and macronutrient data, food text descriptions), and body composition information including height, weight, age, gender, BMI, body fat percentage, muscle mass, visceral fat, body water percentage, and body age. Physique scoring data (individual muscle group scores, balance suggestions, training frequency analysis) is calculated locally from your workout history. This data is used solely to provide personalised fitness and nutrition features within the app.\n\n1.4 Conversation and Chat Data\nMessages sent through the Bible Friend chat feature, the Coach (fitness) chat feature, and direct messaging between users. Both chat features support text input and voice input (speech-to-text via your device microphone).\n\n1.5 Usage Data\nApp interaction data such as streaks, points, achievement progress, quiz scores, Bible timeline exploration, Bible map visits, Bible character reading progress, and feature usage \u2014 used to provide achievements, leaderboards, and personalised experiences.\n\n1.6 Device Information and Push Notification Tokens\nWe access device information (via Expo Device) solely for push notification delivery. We collect Expo push notification tokens to deliver notifications you have opted into. We do not collect or store device identifiers for tracking purposes.\n\n1.7 Photos and Camera\nIf you choose to use the camera or photo library, images are processed for profile pictures, food nutritional analysis, gym/physique analysis via the Coach feature, or prayer board customisation. Photos used for food scanning or the Coach feature are sent to Google Gemini for analysis and are not stored on our servers.\n\nProfile picture uploads: If you are an email-verified user and choose to upload a custom profile photo, the image is sent to Google Gemini for automated content moderation before it is accepted. If the image passes moderation, it is uploaded to Firebase Storage. If it does not pass, no image is stored and a 24-hour cooldown is applied.\n\n1.8 Preferences and Customisation\nYour app preferences including selected theme (from 25+ available themes), loading animation choice, Bible translation preference, notification settings, weight unit preference (kg/lbs), and referral status. These are stored locally on your device and synced to the cloud for cross-device access.' },
                { title: '2. How We Use Your Data', content: '\u2022 To provide and personalise app features (Bible reading, prayer tracking, prayer boards, workouts, nutrition, physique tracking, todos, journal)\n\u2022 To sync your data across devices via Firebase and iCloud\n\u2022 To send push notifications (prayer reminders, workout reminders, task reminders, streak alerts) that you opt into\n\u2022 To generate personalised insights and responses using external services (see Section 4)\n\u2022 To suggest workouts based on your muscle split plan, available equipment, and physique scoring data\n\u2022 To enable social features (direct messaging, friend connections, leaderboards, social feed)\n\u2022 To provide text-to-speech audio playback of Bible passages and chat responses\n\u2022 To convert voice input to text for chat features (speech-to-text)\n\u2022 To recognise text from images (OCR) for supported features\n\u2022 To track achievements, points, and progress across Bible, fitness, and productivity features\n\u2022 To link to external exercise tutorial videos on YouTube based on exercise names' },
                { title: '3. Data Storage and Retention', content: '3.1 Local Storage\nYour data is stored locally on your device using AsyncStorage, so the app works offline. Food logs older than 90 days and workout history older than 90 days are automatically cleaned from local storage. Exercise data is cached locally for up to 30 days.\n\n3.2 Local Caches\n\u2022 Bible cache: Downloaded Bible translation data is cached locally for up to 30 days for offline reading.\n\u2022 Text-to-speech audio cache: Generated audio files are cached locally for up to 1 year to reduce repeated processing.\n\u2022 Exercise database cache: Exercise data is cached locally for up to 30 days.\n\n3.3 Cloud Storage (Firebase)\nYour data is synced to Google Firebase (Firestore) servers located in the United States to enable cross-device access and social features. Cloud data is retained for as long as your account exists. When you delete your account, all associated cloud data is permanently removed.\n\n3.4 iCloud Sync\nOn iOS, your data may be synced via Apple iCloud (CloudKit) if you are signed into iCloud.' },
                { title: '4. Third-Party Services', content: '\u2022 Google Firebase \u2014 authentication, cloud database, and file storage\n\u2022 Apple iCloud / CloudKit \u2014 data sync on iOS devices\n\u2022 DeepSeek \u2014 text-based analysis for personalised insights, Bible study responses, prayer guidance, nutrition advice, workout suggestions, physique coaching, and task scoring. Note: DeepSeek is operated by a company based in the People\'s Republic of China. Data sent to DeepSeek may be transmitted to and processed on servers located in China.\n\u2022 Google Gemini \u2014 food photo nutritional analysis, gym/physique photo analysis via the Coach feature, and profile picture content moderation\n\u2022 Google Cloud Text-to-Speech \u2014 audio Bible reading and chat response playback\n\u2022 OCR.space \u2014 text recognition from images\n\u2022 GitHub \u2014 Bible translation data, exercise data, and quiz question data hosting\n\u2022 Resend \u2014 email delivery for verification codes\n\u2022 Expo Push Notification Service \u2014 push notification delivery\n\u2022 YouTube \u2014 exercise tutorial video links (the app opens YouTube search; no personal data is sent)' },
                { title: '5. International Data Transfers', content: 'Your data may be transferred to and processed in countries outside your country of residence, including:\n\n\u2022 United States: Firebase (Google) servers for cloud storage, authentication, and database services.\n\u2022 People\'s Republic of China: DeepSeek servers for text-based analysis and personalised insights.\n\nWe rely on the data protection practices of our service providers and limit the data shared to what is necessary for each feature.' },
                { title: '6. Data Sharing', content: 'We do not sell, rent, or share your personal data with third parties for marketing or advertising purposes. Data is only shared with the third-party services listed in Section 4, solely to provide app functionality.' },
                { title: '7. Analytics and Tracking', content: 'We do not use any analytics or tracking SDKs. We do not track you across apps or websites. No advertising identifiers are collected.' },
                { title: '8. Your Rights', content: 'Access: You can view all your data within the app at any time.\n\nRectification: You can correct or update your personal information through the app\'s profile and settings screens.\n\nDeletion: You can delete your account and all associated data from Settings > Delete Account. This permanently removes your data from Firebase and your device.\n\nPortability: Your data is stored locally on your device and accessible through standard device backup mechanisms.\n\nFor users in the European Economic Area (GDPR): We process your personal data on the basis of legitimate interest, consent, and contract performance. You have the right to lodge a complaint with your local data protection supervisory authority.\n\nFor California residents (CCPA): You have the right to know what personal information we collect, to request deletion, and to opt out of the sale of personal information. We do not sell your personal information.' },
                { title: '9. Children\'s Privacy', content: 'Biblely is not directed at children under 12. We do not knowingly collect personal data from children under the age of 12. If we discover that we have inadvertently collected data from a child under 12, we will promptly delete that data.' },
                { title: '10. Security', content: 'We use industry-standard security measures including Firebase Authentication, encrypted connections (HTTPS/TLS), and secure password hashing. All data transmitted to third-party services is sent over encrypted connections.' },
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
              <Text style={{ fontSize: 12, color: isDark ? '#888' : '#999', marginBottom: 20 }}>Last updated: March 21, 2026</Text>
              <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22, marginBottom: 16 }}>
                Welcome to Biblely. By using the app, you agree to these Terms of Service. If you do not agree, please do not use the app.
              </Text>

              {[
                { title: '1. Description of Service', content: 'Biblely is a faith, fitness, and productivity companion app that provides:\n\n\u2022 Bible: Bible reading with 44+ translations, verse saving, highlighting, bookmarking, notes, text-to-speech audio, Bible quiz, Bible timeline, Bible maps, Bible characters, and thematic study guides\n\u2022 Prayer: Personal prayer tracking, prayer boards with customisable folders/envelopes, stickers, photos, and backgrounds, and prayer reminders\n\u2022 Fitness: Workout logging with sets/reps/weights, 1300+ exercise library with video tutorial links, workout templates, weekly split planning with muscle group and equipment configuration, physique tracking with body map and muscle group scoring, and a Coach chat for fitness guidance\n\u2022 Nutrition: Food logging with camera-based scanning, calorie and macronutrient tracking, favourite meals, personalised daily targets, and body composition estimates\n\u2022 Productivity: Task management with scheduling, priority scoring, calendar views, and streaks\n\u2022 Social: Friend connections, direct messaging, social feed, and leaderboards\n\u2022 Customisation: 25+ visual themes, wallpapers, custom loading animations, and personalisation options\n\u2022 Achievements: Points system, level progression, and achievement badges across all app features\n\u2022 Journal: Personal journaling with calendar view and verse-linked notes\n\nThe app is provided free of charge with no subscriptions or in-app purchases.' },
                { title: '2. Eligibility and Account Registration', content: 'You must be at least 12 years of age to use Biblely. If you are under 18, you represent that you have your parent\'s or legal guardian\'s permission to use the app.\n\nTo access certain features (cloud sync, social features, messaging), you must create an account with a valid email address. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.' },
                { title: '3. Acceptable Use', content: 'You agree not to:\n\n\u2022 Use the app for any unlawful purpose\n\u2022 Post offensive, hateful, or inappropriate content on social features\n\u2022 Harass, bully, or threaten other users through messaging or social features\n\u2022 Attempt to interfere with or disrupt the app\'s services\n\u2022 Create multiple accounts for deceptive purposes\n\u2022 Scrape, copy, or redistribute Bible translations or app content\n\u2022 Exploit the referral system through fraudulent or deceptive means' },
                { title: '4. User Content and Content Moderation', content: 'You retain ownership of content you create (prayers, journal entries, todos, posts, prayer boards). By posting content to social features (social feed), you grant us a non-exclusive license to display that content to other users within the app. You can delete your content at any time.\n\nWe employ automated profanity filtering and community reporting features to maintain a safe environment. We reserve the right to review, remove, or restrict any user-generated content if it violates these terms. Custom profile picture uploads are automatically scanned by Google Gemini for inappropriate content before being accepted. Rejected images are not stored, and a 24-hour cooldown is applied before you can attempt another upload.' },
                { title: '5. Bible Content', content: 'Bible translations available in the app are provided for personal, non-commercial use only. You may not redistribute, sell, or commercially use Bible text obtained through the app. Bible quiz questions, timeline content, character profiles, and map data are provided for educational and personal reflection purposes.' },
                { title: '6. Automated Content and Disclaimer', content: 'Biblely uses automated systems, including third-party services such as DeepSeek and Google Gemini, to generate certain content within the app. This includes:\n\n\u2022 Nutrition plans and dietary suggestions\n\u2022 Workout and exercise plans, including suggestions based on your weekly split, available equipment, and physique data\n\u2022 Bible verse explanations and interpretations\n\u2022 Fitness and physique coaching advice via the Coach feature\n\u2022 Calorie and nutritional estimates from food photos\n\u2022 Task priority scoring and suggestions\n\u2022 Physique scores, muscle group balance analysis, and training recommendations\n\u2022 Body composition estimates (BMI, body fat, muscle mass, visceral fat, body water, body age)\n\nThis automatically generated content may contain errors, inaccuracies, or omissions. You should not solely rely on this content for making important decisions regarding your health, diet, fitness, or spiritual life.' },
                { title: '7. Bible Interpretation Disclaimer', content: 'Bible verse explanations, study notes, quiz explanations, character profiles, timeline descriptions, and interpretive content provided within the app are generated by automated systems and are intended for personal reflection and educational purposes only. This content does not constitute pastoral counselling, theological advice, or doctrinal instruction.' },
                { title: '8. Health and Fitness Disclaimer', content: 'Biblely provides workout tracking, nutrition tracking, physique scoring, and body composition estimates for informational and wellness purposes only. These features are NOT medical advice and should not be used as a substitute for professional medical advice, diagnosis, or treatment.\n\nPhysique scores and muscle group ratings are calculated from your self-reported workout history and are intended to help you track relative progress over time. They are not clinical assessments.\n\nExercise tutorial videos linked from the app are hosted on YouTube by third-party creators. We do not produce, verify, or endorse the content of these videos.\n\nAlways consult a healthcare professional before making significant changes to your diet or exercise routine.' },
                { title: '9. Third-Party Services', content: 'Biblely relies on third-party services to deliver its features:\n\n\u2022 Firebase (Google) \u2014 authentication, cloud database, and file storage\n\u2022 Apple \u2014 App Store terms, Apple ID authentication, and platform services\n\u2022 DeepSeek \u2014 automated content generation\n\u2022 Google (Gemini) \u2014 automated content generation and image analysis\n\u2022 Google Cloud Text-to-Speech \u2014 audio Bible reading and chat response playback\n\u2022 OCR.space \u2014 text recognition\n\u2022 GitHub \u2014 Bible translation, exercise, and quiz data hosting\n\u2022 Resend \u2014 email delivery for verification codes\n\u2022 Expo Push Notification Service \u2014 push notifications\n\u2022 YouTube \u2014 exercise tutorial video links\n\nWe are not responsible for the availability, accuracy, or policies of third-party services.' },
                { title: '10. Intellectual Property', content: 'The app, its design, code, graphics, themes, and non-Bible content are owned by Biblely. You may not copy, modify, distribute, or reverse engineer the app or its components.' },
                { title: '11. Account Termination', content: 'You may delete your account at any time through Settings > Delete Account. We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, your data will be permanently deleted from our servers.' },
                { title: '12. Limitation of Liability', content: 'The app is provided "as is" without warranties of any kind, either express or implied. To the fullest extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the app.' },
                { title: '13. Indemnification', content: 'You agree to indemnify, defend, and hold harmless Biblely, its developer, and any affiliates from and against any claims, liabilities, damages, losses, costs, and expenses arising out of your use of the app, your violation of these Terms, or your violation of any rights of another person or entity.' },
                { title: '14. Dispute Resolution', content: 'Any dispute arising out of or relating to these Terms shall be resolved through binding arbitration in accordance with the laws of Australia.\n\nClass Action Waiver: You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action.' },
                { title: '15. Changes to Terms', content: 'We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.' },
                { title: '16. Governing Law', content: 'These Terms of Service are governed by the laws of Australia.' },
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
                { q: 'How do I create an account?', a: 'Open Biblely and tap "Sign Up". Enter your email address, name, username, age, and gender. You\'ll receive a verification code via email \u2014 enter it to complete registration. Your account lets you sync data across devices and access social features.' },
                { q: 'Is Biblely free?', a: 'Yes. Biblely is completely free to use with no subscriptions, no in-app purchases, and no ads. All features are available to every user. Some premium themes and loading animations can be unlocked through the referral system.' },
                { q: 'How does data sync work?', a: 'Your data is stored locally on your device and automatically synced to the cloud via Firebase. This means your data is available even when you\'re offline. When you reconnect, changes are synced automatically. On iOS, iCloud sync is also available if you\'re signed in to iCloud.' },
                { q: 'How do I delete my account?', a: 'Go to Settings (via your Profile tab) and tap "Delete Account". This permanently removes all your data from our servers and your device. This action cannot be undone.' },
                // Bible
                { q: 'How many Bible translations are available?', a: 'Biblely offers 44+ Bible translations spanning multiple languages. You can switch translations at any time from the Bible reader. Translation data is downloaded and cached locally for offline reading.' },
                { q: 'Can I listen to the Bible?', a: 'Yes. The Bible reader includes a text-to-speech feature that reads passages aloud. You can choose from a selection of voice styles. Audio is generated using Google Cloud Text-to-Speech and cached locally so you can listen offline after the first playback.' },
                { q: 'How do I save or highlight verses?', a: 'While reading, tap on a verse to select it. You\'ll see options to save, highlight (with multiple colour choices), bookmark, or add a personal note. All saved verses are accessible from the "Saved Verses" screen.' },
                { q: 'What is Bible Friend?', a: 'Bible Friend is a chat companion that helps you explore and understand scripture. You can ask questions about Bible passages, request explanations, or have a conversation about what you\'re reading. It supports both text and voice input.' },
                { q: 'What is the Bible Quiz?', a: 'The Bible Quiz lets you test your knowledge across six categories: New Testament, Old Testament, Life of Jesus, Miracles, Parables, and Women of the Bible. Questions range from beginner to advanced difficulty and earn you points toward achievements.' },
                { q: 'What are Bible Timeline, Maps, and Characters?', a: 'These are interactive study tools. The Timeline lets you explore key Biblical events in chronological order. Maps show the geographical locations of Biblical events. Characters provides detailed profiles of important people in the Bible.' },
                // Prayer
                { q: 'What are Prayer Boards?', a: 'Prayer Boards are visual, customisable boards where you can organise your prayers creatively. You can create multiple boards, each with its own title and background colour or custom background image. Within each board, you can add folders, envelopes, stickers, and photos.' },
                { q: 'How do I customise a Prayer Board?', a: 'Open a prayer board and use the editing tools to add folders, envelopes, stickers, and photos. You can change the board\'s background colour or set a custom background image. Tap the title to rename it. You can also save your board as an image to share.' },
                { q: 'Can I delete a Prayer Board?', a: 'Yes. Open the board you want to delete and use the delete option. This permanently removes the board and all its contents.' },
                { q: 'How do prayer reminders work?', a: 'Go to your Profile settings and enable prayer reminders. You can choose the time of day you\'d like to be reminded. The app will send you a gentle notification to take a moment for prayer.' },
                { q: 'How do I set my profile picture?', a: 'You can choose from 25 preset avatar images or use your initials as your avatar. Go to your Profile tab, tap "Edit Profile", and select an avatar from the grid.' },
                { q: 'Can I upload my own profile photo?', a: 'Yes, but only if your email address is verified. Once verified, you\'ll see an "Upload Your Own Photo" button below the preset avatars. Your photo will be automatically checked to ensure it\'s appropriate before it\'s accepted.' },
                { q: 'Why was my profile picture rejected?', a: 'Uploaded photos are automatically scanned to ensure they\'re appropriate for a family-friendly app. Photos may be rejected if they contain nudity, violence, hate symbols, offensive text, or other inappropriate content. You can try uploading a different photo after 24 hours.' },
                // Fitness
                { q: 'How do I log a workout?', a: 'Go to the Gym tab and start a new workout. You can choose from the exercise library (1300+ exercises), use a pre-built template, or generate a smart workout. During the workout, log your sets, reps, and weights for each exercise.' },
                { q: 'How do I set up my workout split?', a: 'Go to the Gym tab and open your workout split settings. You can assign muscle groups to each day of the week, set the number of exercises per day, and specify how many exercises per muscle group.' },
                { q: 'How do I select my available equipment?', a: 'In the workout split settings, you\'ll find an "Available Equipment" section. Select the equipment you have access to (e.g., dumbbells, barbell, Smith machine, cables, resistance bands). The smart workout generator will only suggest exercises using your selected equipment.' },
                { q: 'What is the Physique / Body Map feature?', a: 'The Body Map is a visual representation of your muscle development. Based on your workout history, each muscle group is scored and colour-coded to show your relative development. It also provides balance suggestions for undertrained areas.' },
                { q: 'How do exercise tutorial videos work?', a: 'When browsing the exercise library or during an active workout, you\'ll see a play button next to each exercise. Tapping it opens a YouTube search for that exercise\'s form tutorial. These videos are hosted by third-party creators on YouTube.' },
                { q: 'What is the Coach?', a: 'The Coach is a fitness chat companion that provides personalised guidance. You can ask about exercise form, nutrition, workout programming, or send a gym photo for analysis and feedback. It supports both text and voice input.' },
                // Nutrition
                { q: 'How does food scanning work?', a: 'Tap the camera button in the Nutrition section. Take a photo of your meal and the app will estimate its calories, protein, carbs, and fat. You can edit the values before saving. For better accuracy: use good lighting and photograph the food clearly from above.' },
                { q: 'How are my calorie targets calculated?', a: 'Your targets are calculated based on your height, weight, age, gender, and activity level using the Mifflin-St Jeor equation for Total Daily Energy Expenditure (TDEE). You can adjust your target based on your goal (lose weight, maintain, or gain weight).' },
                { q: 'How accurate are nutritional estimates from food photos?', a: 'Nutritional estimates from food photos are approximations. They may vary from actual nutritional values. For precise dietary tracking or medical dietary requirements, we recommend using verified nutritional databases or consulting a registered dietitian.' },
                // Tasks
                { q: 'How does task scoring work?', a: 'When you add a task, the app analyses its complexity and assigns it a point value. Quick tasks earn fewer points, while complex or time-intensive tasks earn more. Complete tasks to build your streak and earn points.' },
                { q: 'Can I schedule tasks for future dates?', a: 'Yes. Tap the calendar icon when creating or viewing a task to pick a specific date. Tasks are organised by date with the closest deadlines shown first.' },
                // Customisation
                { q: 'How many themes are available?', a: 'Biblely offers 25+ themes ranging from light and dark modes to unique visual styles with custom wallpapers and colour palettes. Some themes are available to all users, while others can be unlocked through the referral system.' },
                { q: 'What are loading animations?', a: 'You can choose from different loading animations (Default, Running Cat, or Run Hamster) to personalise how the app looks while content is loading. Select your preferred animation in the Customisation settings.' },
                // Referrals & Achievements
                { q: 'How does the referral system work?', a: 'Every user has a unique referral code. Share your code with friends, and when they sign up using it, both of you earn rewards. Referrals unlock premium themes, loading animations, and other exclusive content.' },
                { q: 'What are achievements?', a: 'Achievements are badges you earn by reaching milestones across all app features \u2014 such as completing workouts, maintaining prayer streaks, finishing Bible quizzes, logging food, and completing tasks. Each achievement awards points that contribute to your level and leaderboard ranking.' },
                // Privacy & Data
                { q: 'Is my data private?', a: 'Yes. We do not sell or share your data with third parties for marketing. We do not use analytics or tracking SDKs. Your data is only used to provide app features. See our Privacy Policy for full details.' },
                { q: 'Does the app work offline?', a: 'Yes. Core features work offline since your data is stored locally. Bible translations are cached for offline reading. Features that require an internet connection include cloud sync, social features, chat features, food photo scanning, and text-to-speech audio generation (on first playback).' },
                { q: 'My data isn\'t syncing across devices.', a: 'Ensure you have an active internet connection. Data syncs automatically when the app is open and connected. If sync seems stuck, try closing and reopening the app. Check that you\'re signed into the correct account.' },
                // Troubleshooting
                { q: 'The app isn\'t loading or is stuck on a loading screen', a: 'Try closing the app completely and reopening it. If the problem persists, check your internet connection. As a last resort, delete and reinstall the app \u2014 your data will be restored from the cloud once you sign back in.' },
                { q: 'Notifications aren\'t working', a: 'Check that you\'ve enabled notifications for Biblely in your iPhone\'s Settings > Notifications > Biblely. Within the app, ensure the specific notification types you want are turned on. If notifications still don\'t arrive, try signing out and signing back in.' },
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
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFF' : '#1a1a2e', marginBottom: 4 }}>{item.abbr} — {item.name}</Text>
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
