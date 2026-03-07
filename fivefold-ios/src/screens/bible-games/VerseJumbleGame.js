import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import hapticFeedback from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VERSES = [
  // ── Original 35 ──
  { text: 'For God so loved the world that he gave his one and only Son', ref: 'John 3:16' },
  { text: 'The Lord is my shepherd I shall not want', ref: 'Psalm 23:1' },
  { text: 'I can do all things through Christ who strengthens me', ref: 'Philippians 4:13' },
  { text: 'Trust in the Lord with all your heart', ref: 'Proverbs 3:5' },
  { text: 'Be strong and courageous', ref: 'Joshua 1:9' },
  { text: 'The Lord is my light and my salvation', ref: 'Psalm 27:1' },
  { text: 'In the beginning God created the heavens and the earth', ref: 'Genesis 1:1' },
  { text: 'Love is patient love is kind', ref: '1 Corinthians 13:4' },
  { text: 'For I know the plans I have for you', ref: 'Jeremiah 29:11' },
  { text: 'Do not be anxious about anything', ref: 'Philippians 4:6' },
  { text: 'The joy of the Lord is your strength', ref: 'Nehemiah 8:10' },
  { text: 'Be still and know that I am God', ref: 'Psalm 46:10' },
  { text: 'God is our refuge and strength', ref: 'Psalm 46:1' },
  { text: 'He makes me lie down in green pastures', ref: 'Psalm 23:2' },
  { text: 'Your word is a lamp to my feet', ref: 'Psalm 119:105' },
  { text: 'The heavens declare the glory of God', ref: 'Psalm 19:1' },
  { text: 'Come to me all you who are weary', ref: 'Matthew 11:28' },
  { text: 'I am the way the truth and the life', ref: 'John 14:6' },
  { text: 'Ask and it will be given to you', ref: 'Matthew 7:7' },
  { text: 'Blessed are the pure in heart', ref: 'Matthew 5:8' },
  { text: 'Faith without works is dead', ref: 'James 2:26' },
  { text: 'Create in me a clean heart O God', ref: 'Psalm 51:10' },
  { text: 'Cast all your anxiety on him', ref: '1 Peter 5:7' },
  { text: 'Delight yourself in the Lord', ref: 'Psalm 37:4' },
  { text: 'The Lord will fight for you', ref: 'Exodus 14:14' },
  { text: 'Do everything in love', ref: '1 Corinthians 16:14' },
  { text: 'He will never leave you nor forsake you', ref: 'Deuteronomy 31:6' },
  { text: 'Seek first his kingdom and his righteousness', ref: 'Matthew 6:33' },
  { text: 'With God all things are possible', ref: 'Matthew 19:26' },
  { text: 'And now these three remain faith hope and love', ref: '1 Corinthians 13:13' },
  { text: 'Set your minds on things above', ref: 'Colossians 3:2' },
  { text: 'The name of the Lord is a fortified tower', ref: 'Proverbs 18:10' },
  { text: 'Let your light shine before others', ref: 'Matthew 5:16' },
  { text: 'Wait on the Lord and be of good courage', ref: 'Psalm 27:14' },
  { text: 'Those who hope in the Lord will renew their strength', ref: 'Isaiah 40:31' },
  // ── Genesis ──
  { text: 'Let there be light', ref: 'Genesis 1:3' },
  { text: 'It is not good for the man to be alone', ref: 'Genesis 2:18' },
  { text: 'Am I my brothers keeper', ref: 'Genesis 4:9' },
  { text: 'I will make you into a great nation and I will bless you', ref: 'Genesis 12:2' },
  { text: 'Is anything too hard for the Lord', ref: 'Genesis 18:14' },
  { text: 'The Lord will provide', ref: 'Genesis 22:14' },
  { text: 'I am with you and will watch over you wherever you go', ref: 'Genesis 28:15' },
  { text: 'You intended to harm me but God intended it for good', ref: 'Genesis 50:20' },
  // ── Exodus ──
  { text: 'I am who I am', ref: 'Exodus 3:14' },
  { text: 'You shall have no other gods before me', ref: 'Exodus 20:3' },
  { text: 'Honour your father and your mother', ref: 'Exodus 20:12' },
  { text: 'The Lord is slow to anger abounding in love', ref: 'Exodus 34:6' },
  // ── Leviticus ──
  { text: 'Love your neighbour as yourself', ref: 'Leviticus 19:18' },
  { text: 'Be holy because I the Lord your God am holy', ref: 'Leviticus 19:2' },
  // ── Numbers ──
  { text: 'The Lord bless you and keep you', ref: 'Numbers 6:24' },
  { text: 'The Lord make his face shine on you', ref: 'Numbers 6:25' },
  // ── Deuteronomy ──
  { text: 'Love the Lord your God with all your heart', ref: 'Deuteronomy 6:5' },
  { text: 'Man does not live on bread alone', ref: 'Deuteronomy 8:3' },
  { text: 'I have set before you life and death blessings and curses', ref: 'Deuteronomy 30:19' },
  // ── Joshua ──
  { text: 'Choose for yourselves this day whom you will serve', ref: 'Joshua 24:15' },
  { text: 'Every place where you set your foot will be yours', ref: 'Joshua 1:3' },
  // ── Judges ──
  { text: 'The Lord is with you mighty warrior', ref: 'Judges 6:12' },
  // ── Ruth ──
  { text: 'Where you go I will go', ref: 'Ruth 1:16' },
  { text: 'Your people will be my people and your God my God', ref: 'Ruth 1:16b' },
  // ── 1 Samuel ──
  { text: 'The Lord looks at the heart', ref: '1 Samuel 16:7' },
  { text: 'The battle is the Lords', ref: '1 Samuel 17:47' },
  // ── 2 Samuel ──
  { text: 'The Lord is my rock my fortress and my deliverer', ref: '2 Samuel 22:2' },
  // ── 1 Kings ──
  { text: 'Give your servant a discerning heart', ref: '1 Kings 3:9' },
  // ── 2 Kings ──
  { text: 'Do not be afraid for those who are with us are more', ref: '2 Kings 6:16' },
  // ── 1 Chronicles ──
  { text: 'Give thanks to the Lord for he is good', ref: '1 Chronicles 16:34' },
  { text: 'Yours O Lord is the greatness and the power', ref: '1 Chronicles 29:11' },
  // ── 2 Chronicles ──
  { text: 'If my people who are called by my name will humble themselves', ref: '2 Chronicles 7:14' },
  // ── Nehemiah ──
  { text: 'Do not grieve for the joy of the Lord is your strength', ref: 'Nehemiah 8:10b' },
  // ── Job ──
  { text: 'The Lord gave and the Lord has taken away', ref: 'Job 1:21' },
  { text: 'I know that my redeemer lives', ref: 'Job 19:25' },
  // ── Psalms ──
  { text: 'He restores my soul', ref: 'Psalm 23:3' },
  { text: 'Taste and see that the Lord is good', ref: 'Psalm 34:8' },
  { text: 'As the deer pants for streams of water so my soul pants for you', ref: 'Psalm 42:1' },
  { text: 'Search me O God and know my heart', ref: 'Psalm 139:23' },
  { text: 'I praise you because I am fearfully and wonderfully made', ref: 'Psalm 139:14' },
  { text: 'Great is the Lord and most worthy of praise', ref: 'Psalm 145:3' },
  { text: 'He heals the brokenhearted and binds up their wounds', ref: 'Psalm 147:3' },
  { text: 'The Lord is gracious and compassionate', ref: 'Psalm 145:8' },
  { text: 'Let everything that has breath praise the Lord', ref: 'Psalm 150:6' },
  { text: 'This is the day the Lord has made', ref: 'Psalm 118:24' },
  { text: 'The Lord is near to the brokenhearted', ref: 'Psalm 34:18' },
  { text: 'Teach me your way O Lord', ref: 'Psalm 27:11' },
  { text: 'He leads me beside quiet waters', ref: 'Psalm 23:2b' },
  // ── Proverbs ──
  { text: 'The fear of the Lord is the beginning of wisdom', ref: 'Proverbs 9:10' },
  { text: 'A gentle answer turns away wrath', ref: 'Proverbs 15:1' },
  { text: 'Guard your heart for everything you do flows from it', ref: 'Proverbs 4:23' },
  { text: 'Commit to the Lord whatever you do and he will establish your plans', ref: 'Proverbs 16:3' },
  { text: 'Iron sharpens iron so one person sharpens another', ref: 'Proverbs 27:17' },
  { text: 'Train up a child in the way he should go', ref: 'Proverbs 22:6' },
  { text: 'Above all else guard your heart', ref: 'Proverbs 4:23b' },
  { text: 'Plans fail for lack of counsel', ref: 'Proverbs 15:22' },
  // ── Ecclesiastes ──
  { text: 'There is a time for everything', ref: 'Ecclesiastes 3:1' },
  { text: 'A cord of three strands is not quickly broken', ref: 'Ecclesiastes 4:12' },
  { text: 'He has made everything beautiful in its time', ref: 'Ecclesiastes 3:11' },
  // ── Song of Solomon ──
  { text: 'Many waters cannot quench love', ref: 'Song of Solomon 8:7' },
  // ── Isaiah ──
  { text: 'Here am I send me', ref: 'Isaiah 6:8' },
  { text: 'For unto us a child is born', ref: 'Isaiah 9:6' },
  { text: 'He was pierced for our transgressions', ref: 'Isaiah 53:5' },
  { text: 'But those who hope in the Lord will renew their strength', ref: 'Isaiah 40:31b' },
  { text: 'Fear not for I am with you', ref: 'Isaiah 41:10' },
  { text: 'Come now let us settle the matter', ref: 'Isaiah 1:18' },
  { text: 'No weapon forged against you will prevail', ref: 'Isaiah 54:17' },
  { text: 'By his wounds we are healed', ref: 'Isaiah 53:5b' },
  { text: 'I have called you by name you are mine', ref: 'Isaiah 43:1' },
  { text: 'See I am doing a new thing', ref: 'Isaiah 43:19' },
  // ── Jeremiah ──
  { text: 'Before I formed you in the womb I knew you', ref: 'Jeremiah 1:5' },
  { text: 'Call to me and I will answer you', ref: 'Jeremiah 33:3' },
  { text: 'Blessed is the one who trusts in the Lord', ref: 'Jeremiah 17:7' },
  { text: 'You will seek me and find me when you seek me with all your heart', ref: 'Jeremiah 29:13' },
  // ── Lamentations ──
  { text: 'Great is your faithfulness', ref: 'Lamentations 3:23' },
  { text: 'His mercies are new every morning', ref: 'Lamentations 3:23b' },
  // ── Ezekiel ──
  { text: 'I will give you a new heart and put a new spirit in you', ref: 'Ezekiel 36:26' },
  // ── Daniel ──
  { text: 'My God sent his angel and he shut the mouths of the lions', ref: 'Daniel 6:22' },
  { text: 'The people who know their God shall be strong', ref: 'Daniel 11:32' },
  // ── Hosea ──
  { text: 'Let us acknowledge the Lord', ref: 'Hosea 6:3' },
  // ── Joel ──
  { text: 'I will pour out my Spirit on all people', ref: 'Joel 2:28' },
  // ── Amos ──
  { text: 'Let justice roll on like a river', ref: 'Amos 5:24' },
  // ── Micah ──
  { text: 'He has shown you what is good', ref: 'Micah 6:8' },
  { text: 'Act justly love mercy walk humbly with your God', ref: 'Micah 6:8b' },
  // ── Nahum ──
  { text: 'The Lord is good a refuge in times of trouble', ref: 'Nahum 1:7' },
  // ── Habakkuk ──
  { text: 'The righteous shall live by faith', ref: 'Habakkuk 2:4' },
  // ── Zephaniah ──
  { text: 'The Lord your God is with you the mighty warrior who saves', ref: 'Zephaniah 3:17' },
  // ── Haggai ──
  { text: 'Be strong all you people and work for I am with you', ref: 'Haggai 2:4' },
  // ── Zechariah ──
  { text: 'Not by might nor by power but by my Spirit', ref: 'Zechariah 4:6' },
  // ── Malachi ──
  { text: 'I the Lord do not change', ref: 'Malachi 3:6' },
  { text: 'Bring the whole tithe into the storehouse', ref: 'Malachi 3:10' },
  // ── Matthew ──
  { text: 'Blessed are the peacemakers', ref: 'Matthew 5:9' },
  { text: 'Love your enemies and pray for those who persecute you', ref: 'Matthew 5:44' },
  { text: 'Do not worry about tomorrow for tomorrow will worry about itself', ref: 'Matthew 6:34' },
  { text: 'Enter through the narrow gate', ref: 'Matthew 7:13' },
  { text: 'Go and make disciples of all nations', ref: 'Matthew 28:19' },
  { text: 'I am with you always to the very end of the age', ref: 'Matthew 28:20' },
  { text: 'You are the salt of the earth', ref: 'Matthew 5:13' },
  { text: 'You are the light of the world', ref: 'Matthew 5:14' },
  // ── Mark ──
  { text: 'All things are possible for one who believes', ref: 'Mark 9:23' },
  { text: 'The time has come the kingdom of God has come near', ref: 'Mark 1:15' },
  { text: 'What shall it profit a man to gain the whole world', ref: 'Mark 8:36' },
  // ── Luke ──
  { text: 'For nothing will be impossible with God', ref: 'Luke 1:37' },
  { text: 'Glory to God in the highest', ref: 'Luke 2:14' },
  { text: 'The Son of Man came to seek and to save the lost', ref: 'Luke 19:10' },
  { text: 'Father forgive them for they do not know what they are doing', ref: 'Luke 23:34' },
  // ── John ──
  { text: 'The Word became flesh and made his dwelling among us', ref: 'John 1:14' },
  { text: 'You must be born again', ref: 'John 3:7' },
  { text: 'I am the bread of life', ref: 'John 6:35' },
  { text: 'I am the good shepherd', ref: 'John 10:11' },
  { text: 'I am the resurrection and the life', ref: 'John 11:25' },
  { text: 'I am the vine you are the branches', ref: 'John 15:5' },
  { text: 'The truth will set you free', ref: 'John 8:32' },
  { text: 'Peace I leave with you my peace I give you', ref: 'John 14:27' },
  { text: 'A new command I give you love one another', ref: 'John 13:34' },
  // ── Acts ──
  { text: 'You will receive power when the Holy Spirit comes on you', ref: 'Acts 1:8' },
  { text: 'Believe in the Lord Jesus and you will be saved', ref: 'Acts 16:31' },
  { text: 'In him we live and move and have our being', ref: 'Acts 17:28' },
  // ── Romans ──
  { text: 'For all have sinned and fall short of the glory of God', ref: 'Romans 3:23' },
  { text: 'The wages of sin is death but the gift of God is eternal life', ref: 'Romans 6:23' },
  { text: 'If God is for us who can be against us', ref: 'Romans 8:31' },
  { text: 'All things work together for good for those who love God', ref: 'Romans 8:28' },
  { text: 'Nothing can separate us from the love of God', ref: 'Romans 8:39' },
  { text: 'Do not conform to the pattern of this world', ref: 'Romans 12:2' },
  // ── 1 Corinthians ──
  { text: 'God is faithful he will not let you be tempted beyond what you can bear', ref: '1 Corinthians 10:13' },
  { text: 'The greatest of these is love', ref: '1 Corinthians 13:13b' },
  { text: 'Be on your guard stand firm in the faith', ref: '1 Corinthians 16:13' },
  // ── 2 Corinthians ──
  { text: 'Therefore if anyone is in Christ the new creation has come', ref: '2 Corinthians 5:17' },
  { text: 'My grace is sufficient for you', ref: '2 Corinthians 12:9' },
  { text: 'We walk by faith not by sight', ref: '2 Corinthians 5:7' },
  { text: 'God loves a cheerful giver', ref: '2 Corinthians 9:7' },
  // ── Galatians ──
  { text: 'It is for freedom that Christ has set us free', ref: 'Galatians 5:1' },
  { text: 'The fruit of the Spirit is love joy peace', ref: 'Galatians 5:22' },
  { text: 'Let us not become weary in doing good', ref: 'Galatians 6:9' },
  // ── Ephesians ──
  { text: 'For it is by grace you have been saved through faith', ref: 'Ephesians 2:8' },
  { text: 'Put on the full armour of God', ref: 'Ephesians 6:11' },
  { text: 'Be kind and compassionate to one another', ref: 'Ephesians 4:32' },
  { text: 'We are Gods handiwork created in Christ Jesus to do good works', ref: 'Ephesians 2:10' },
  // ── Philippians ──
  { text: 'Rejoice in the Lord always I will say it again rejoice', ref: 'Philippians 4:4' },
  { text: 'The peace of God which transcends all understanding', ref: 'Philippians 4:7' },
  { text: 'He who began a good work in you will carry it on to completion', ref: 'Philippians 1:6' },
  // ── Colossians ──
  { text: 'Whatever you do work at it with all your heart', ref: 'Colossians 3:23' },
  { text: 'Let the peace of Christ rule in your hearts', ref: 'Colossians 3:15' },
  // ── 1 Thessalonians ──
  { text: 'Pray without ceasing', ref: '1 Thessalonians 5:17' },
  { text: 'Give thanks in all circumstances', ref: '1 Thessalonians 5:18' },
  // ── 2 Timothy ──
  { text: 'God has not given us a spirit of fear but of power', ref: '2 Timothy 1:7' },
  { text: 'I have fought the good fight I have finished the race', ref: '2 Timothy 4:7' },
  // ── Hebrews ──
  { text: 'Faith is confidence in what we hope for', ref: 'Hebrews 11:1' },
  { text: 'Jesus Christ is the same yesterday today and forever', ref: 'Hebrews 13:8' },
  { text: 'Let us run with perseverance the race marked out for us', ref: 'Hebrews 12:1' },
  { text: 'Fix your eyes on Jesus the author and perfecter of faith', ref: 'Hebrews 12:2' },
  // ── James ──
  { text: 'Every good and perfect gift is from above', ref: 'James 1:17' },
  { text: 'Come near to God and he will come near to you', ref: 'James 4:8' },
  { text: 'Be quick to listen slow to speak slow to anger', ref: 'James 1:19' },
  { text: 'Resist the devil and he will flee from you', ref: 'James 4:7' },
  // ── 1 Peter ──
  { text: 'You are a chosen people a royal priesthood', ref: '1 Peter 2:9' },
  { text: 'The Lord is not slow in keeping his promise', ref: '2 Peter 3:9' },
  // ── 1 John ──
  { text: 'God is love', ref: '1 John 4:8' },
  { text: 'If we confess our sins he is faithful and just to forgive us', ref: '1 John 1:9' },
  { text: 'Perfect love drives out fear', ref: '1 John 4:18' },
  { text: 'We love because he first loved us', ref: '1 John 4:19' },
  // ── Revelation ──
  { text: 'I am the Alpha and the Omega', ref: 'Revelation 1:8' },
  { text: 'Behold I stand at the door and knock', ref: 'Revelation 3:20' },
  { text: 'He will wipe every tear from their eyes', ref: 'Revelation 21:4' },
  { text: 'I am making all things new', ref: 'Revelation 21:5' },
  { text: 'Worthy is the Lamb who was slain', ref: 'Revelation 5:12' },
  // ── Additional Genesis through Deuteronomy ──
  { text: 'God saw all that he had made and it was very good', ref: 'Genesis 1:31' },
  { text: 'Be fruitful and multiply', ref: 'Genesis 1:28' },
  { text: 'I will bless those who bless you', ref: 'Genesis 12:3' },
  { text: 'Do not be afraid Abram I am your shield', ref: 'Genesis 15:1' },
  { text: 'The Lord is a warrior', ref: 'Exodus 15:3' },
  { text: 'Remember the Sabbath day by keeping it holy', ref: 'Exodus 20:8' },
  { text: 'You shall not steal', ref: 'Exodus 20:15' },
  { text: 'Be strong and very courageous', ref: 'Joshua 1:7' },
  // ── Additional Psalms ──
  { text: 'Why do the nations conspire and the peoples plot in vain', ref: 'Psalm 2:1' },
  { text: 'From the lips of children you have ordained praise', ref: 'Psalm 8:2' },
  { text: 'The fool says in his heart there is no God', ref: 'Psalm 14:1' },
  { text: 'The Lord is my strength and my shield', ref: 'Psalm 28:7' },
  { text: 'Weeping may stay for the night but rejoicing comes in the morning', ref: 'Psalm 30:5' },
  { text: 'O Lord my God I called to you for help and you healed me', ref: 'Psalm 30:2' },
  { text: 'My times are in your hands', ref: 'Psalm 31:15' },
  { text: 'How good and pleasant it is when Gods people live together in unity', ref: 'Psalm 133:1' },
  { text: 'I lift up my eyes to the mountains', ref: 'Psalm 121:1' },
  { text: 'My help comes from the Lord the maker of heaven and earth', ref: 'Psalm 121:2' },
  { text: 'Unless the Lord builds the house the builders labour in vain', ref: 'Psalm 127:1' },
  { text: 'Children are a heritage from the Lord', ref: 'Psalm 127:3' },
  { text: 'Out of the depths I cry to you Lord', ref: 'Psalm 130:1' },
  { text: 'For you created my inmost being', ref: 'Psalm 139:13' },
  { text: 'Where can I go from your Spirit', ref: 'Psalm 139:7' },
  // ── Additional Proverbs ──
  { text: 'The Lord detests dishonest scales but accurate weights find his favour', ref: 'Proverbs 11:1' },
  { text: 'The mouth of the righteous is a fountain of life', ref: 'Proverbs 10:11' },
  { text: 'Pride goes before destruction a haughty spirit before a fall', ref: 'Proverbs 16:18' },
  { text: 'A friend loves at all times', ref: 'Proverbs 17:17' },
  { text: 'The tongue has the power of life and death', ref: 'Proverbs 18:21' },
  { text: 'Direct my footsteps according to your word', ref: 'Psalm 119:133' },
  // ── Additional Isaiah ──
  { text: 'Surely he took up our pain and bore our suffering', ref: 'Isaiah 53:4' },
  { text: 'All we like sheep have gone astray', ref: 'Isaiah 53:6' },
  { text: 'The grass withers the flower fades but the word of our God endures forever', ref: 'Isaiah 40:8' },
  { text: 'Even youths grow tired and weary', ref: 'Isaiah 40:30' },
  { text: 'Do not fear for I have redeemed you', ref: 'Isaiah 43:1b' },
  { text: 'Remember the former things those of long ago', ref: 'Isaiah 46:9' },
  // ── Additional Prophets ──
  { text: 'I will restore to you the years that the locusts have eaten', ref: 'Joel 2:25' },
  { text: 'Where there is no vision the people perish', ref: 'Proverbs 29:18' },
  { text: 'The Lord is in his holy temple let all the earth be silent', ref: 'Habakkuk 2:20' },
  { text: 'Return to me and I will return to you', ref: 'Malachi 3:7' },
  // ── Additional Matthew ──
  { text: 'Blessed are the meek for they will inherit the earth', ref: 'Matthew 5:5' },
  { text: 'Blessed are those who mourn for they will be comforted', ref: 'Matthew 5:4' },
  { text: 'Where your treasure is there your heart will be also', ref: 'Matthew 6:21' },
  { text: 'By their fruit you will recognise them', ref: 'Matthew 7:16' },
  { text: 'The harvest is plentiful but the workers are few', ref: 'Matthew 9:37' },
  // ── Additional John ──
  { text: 'In the beginning was the Word', ref: 'John 1:1' },
  { text: 'Greater love has no one than this to lay down ones life for ones friends', ref: 'John 15:13' },
  { text: 'If you love me keep my commands', ref: 'John 14:15' },
  { text: 'I have told you these things so that in me you may have peace', ref: 'John 16:33' },
  { text: 'Sanctify them by the truth your word is truth', ref: 'John 17:17' },
  // ── Additional Epistles ──
  { text: 'There is now no condemnation for those who are in Christ Jesus', ref: 'Romans 8:1' },
  { text: 'We know that in all things God works for the good', ref: 'Romans 8:28b' },
  { text: 'Be joyful in hope patient in affliction faithful in prayer', ref: 'Romans 12:12' },
  { text: 'Do not be overcome by evil but overcome evil with good', ref: 'Romans 12:21' },
  { text: 'Each of you should use whatever gift you have received to serve others', ref: '1 Peter 4:10' },
  { text: 'Humble yourselves before the Lord and he will lift you up', ref: 'James 4:10' },
  { text: 'Be transformed by the renewing of your mind', ref: 'Romans 12:2b' },
  { text: 'Do not let any unwholesome talk come out of your mouths', ref: 'Ephesians 4:29' },
  { text: 'Stand firm then with the belt of truth buckled around your waist', ref: 'Ephesians 6:14' },
  { text: 'Do not grieve the Holy Spirit of God', ref: 'Ephesians 4:30' },
  { text: 'To live is Christ and to die is gain', ref: 'Philippians 1:21' },
  { text: 'Being confident of this that he who began a good work in you', ref: 'Philippians 1:6b' },
];

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const WordChip = React.memo(({ word, onPress, disabled, selected, isWrong, theme, isDark }) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isWrong) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [isWrong, shakeAnim]);

  const handlePress = useCallback(() => {
    if (disabled || selected) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();
    onPress(word);
  }, [disabled, selected, onPress, word, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={disabled || selected}
        style={[
          styles.wordChip,
          {
            backgroundColor: selected
              ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
              : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'),
            borderColor: selected
              ? 'transparent'
              : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
            opacity: selected ? 0.3 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.wordChipText,
            {
              color: selected
                ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)')
                : (isDark ? '#fff' : '#1a1a2e'),
            },
          ]}
        >
          {word}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function VerseJumbleGame() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [currentVerse, setCurrentVerse] = useState(null);
  const [shuffledWords, setShuffledWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [wrongWord, setWrongWord] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [usedIndices, setUsedIndices] = useState([]);

  const completedAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(1)).current;

  const startNewRound = useCallback(() => {
    const wordCount = (v) => v.text.split(' ').length;
    let pool;
    if (round <= 10) {
      pool = VERSES.filter((v) => wordCount(v) <= 8);
    } else if (round <= 25) {
      pool = VERSES.filter((v) => wordCount(v) >= 6 && wordCount(v) <= 12);
    } else {
      pool = VERSES;
    }
    if (pool.length === 0) pool = VERSES;

    const poolIndices = pool.map((v) => VERSES.indexOf(v));
    let available = poolIndices.filter((i) => !usedIndices.includes(i));
    if (available.length === 0) {
      available = poolIndices;
      setUsedIndices([]);
    }

    const idx = available[Math.floor(Math.random() * available.length)];
    const verse = VERSES[idx];
    const words = verse.text.split(' ');

    let shuffled = shuffleArray(words);
    while (shuffled.join(' ') === words.join(' ')) {
      shuffled = shuffleArray(words);
    }

    setUsedIndices((prev) => [...prev, idx]);
    setCurrentVerse(verse);
    setShuffledWords(shuffled.map((w, i) => ({ word: w, id: `${w}-${i}` })));
    setSelectedWords([]);
    setWrongWord(null);
    setCompleted(false);
    setMistakes(0);
    completedAnim.setValue(0);
  }, [usedIndices, completedAnim, round]);

  useEffect(() => {
    startNewRound();
  }, []);

  const handleWordPress = useCallback(
    (wordObj) => {
      if (!currentVerse || completed) return;

      const correctWords = currentVerse.text.split(' ');
      const nextIndex = selectedWords.length;
      const correctWord = correctWords[nextIndex];

      if (wordObj.word === correctWord) {
        hapticFeedback.light();
        const newSelected = [...selectedWords, wordObj];
        setSelectedWords(newSelected);

        if (newSelected.length === correctWords.length) {
          const roundScore = Math.max(1, correctWords.length - mistakes);
          setScore((prev) => prev + roundScore);
          setCompleted(true);
          hapticFeedback.success();
          Animated.spring(completedAnim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();
          Animated.sequence([
            Animated.timing(scoreAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
            Animated.timing(scoreAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      } else {
        hapticFeedback.warning();
        setWrongWord(wordObj.id);
        setMistakes((prev) => prev + 1);
        setTimeout(() => setWrongWord(null), 400);
      }
    },
    [currentVerse, selectedWords, completed, mistakes, completedAnim, scoreAnim]
  );

  const handleNextRound = useCallback(() => {
    hapticFeedback.light();
    setRound((prev) => prev + 1);
    startNewRound();
  }, [startNewRound]);

  const handleUndo = useCallback(() => {
    if (selectedWords.length === 0 || completed) return;
    hapticFeedback.light();
    setSelectedWords((prev) => prev.slice(0, -1));
  }, [selectedWords, completed]);

  if (!currentVerse) return null;

  const correctWords = currentVerse.text.split(' ');
  const selectedIds = new Set(selectedWords.map((w) => w.id));
  const bg = theme.background || (isDark ? '#0a0a1a' : '#f5f5ff');
  const textColor = theme.text || (isDark ? '#ffffff' : '#1a1a2e');
  const primary = theme.primary || '#6C63FF';
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            navigation.goBack();
          }}
          style={[styles.backButton, { backgroundColor: cardBg }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Verse Jumble</Text>
        <Animated.View style={[styles.scoreContainer, { backgroundColor: cardBg, transform: [{ scale: scoreAnim }] }]}>
          <MaterialIcons name="stars" size={18} color={primary} />
          <Text style={[styles.scoreText, { color: textColor }]}>{score}</Text>
        </Animated.View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.refCard, { backgroundColor: isDark ? 'rgba(108,99,255,0.15)' : 'rgba(108,99,255,0.1)' }]}>
          <MaterialIcons name="menu-book" size={20} color={primary} />
          <Text style={[styles.refText, { color: primary }]}>{currentVerse.ref}</Text>
          <View style={styles.roundBadge}>
            <Text style={[styles.roundText, { color: subtleText }]}>Round {round}</Text>
          </View>
        </View>

        <View style={[styles.constructionArea, { backgroundColor: cardBg, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
          <View style={styles.constructionWords}>
            {correctWords.map((_, idx) => {
              const placed = selectedWords[idx];
              return (
                <View
                  key={idx}
                  style={[
                    styles.wordSlot,
                    {
                      backgroundColor: placed
                        ? (isDark ? 'rgba(108,99,255,0.2)' : 'rgba(108,99,255,0.12)')
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                      borderColor: placed
                        ? primary
                        : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                      borderStyle: placed ? 'solid' : 'dashed',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.slotText,
                      { color: placed ? textColor : 'transparent' },
                    ]}
                  >
                    {placed ? placed.word : correctWords[idx]}
                  </Text>
                </View>
              );
            })}
          </View>

          {selectedWords.length > 0 && !completed && (
            <TouchableOpacity onPress={handleUndo} style={[styles.undoButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
              <MaterialIcons name="undo" size={18} color={subtleText} />
              <Text style={[styles.undoText, { color: subtleText }]}>Undo</Text>
            </TouchableOpacity>
          )}
        </View>

        {!completed && (
          <View style={styles.wordsPool}>
            {shuffledWords.map((wordObj) => (
              <WordChip
                key={wordObj.id}
                word={wordObj.word}
                onPress={() => handleWordPress(wordObj)}
                selected={selectedIds.has(wordObj.id)}
                isWrong={wrongWord === wordObj.id}
                disabled={completed}
                theme={theme}
                isDark={isDark}
              />
            ))}
          </View>
        )}

        {completed && (
          <Animated.View
            style={[
              styles.completedCard,
              {
                backgroundColor: isDark ? 'rgba(108,99,255,0.12)' : 'rgba(108,99,255,0.08)',
                opacity: completedAnim,
                transform: [
                  {
                    translateY: completedAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <MaterialIcons name="check-circle" size={48} color="#34C759" />
            <Text style={[styles.completedTitle, { color: textColor }]}>Well Done!</Text>
            <Text style={[styles.verseDisplay, { color: textColor }]}>
              "{currentVerse.text}"
            </Text>
            <Text style={[styles.verseRef, { color: primary }]}>— {currentVerse.ref}</Text>

            {mistakes > 0 && (
              <Text style={[styles.mistakesText, { color: subtleText }]}>
                {mistakes} mistake{mistakes !== 1 ? 's' : ''}
              </Text>
            )}

            <TouchableOpacity onPress={handleNextRound} activeOpacity={0.8}>
              <LinearGradient
                colors={[primary, isDark ? '#8B83FF' : '#5A52E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButton}
              >
                <Text style={styles.nextButtonText}>Next Verse</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginLeft: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  refCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  refText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  roundBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roundText: {
    fontSize: 13,
    fontWeight: '500',
  },
  constructionArea: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  constructionWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordSlot: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 40,
    alignItems: 'center',
  },
  slotText: {
    fontSize: 16,
    fontWeight: '600',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
    marginTop: 12,
  },
  undoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  wordsPool: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  wordChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  wordChipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  verseDisplay: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 28,
    fontStyle: 'italic',
    marginTop: 4,
  },
  verseRef: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  mistakesText: {
    fontSize: 13,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
    marginTop: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
