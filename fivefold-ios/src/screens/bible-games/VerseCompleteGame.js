import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import hapticFeedback from '../../utils/haptics';

const VERSES = [
  { text: 'For God so loved the _____ that he gave his one and only Son', answer: 'world', options: ['world', 'people', 'earth', 'nations'], ref: 'John 3:16' },
  { text: 'The Lord is my _____, I shall not want', answer: 'shepherd', options: ['shepherd', 'guide', 'protector', 'father'], ref: 'Psalm 23:1' },
  { text: 'I can do all things through Christ who _____ me', answer: 'strengthens', options: ['strengthens', 'guides', 'loves', 'blesses'], ref: 'Philippians 4:13' },
  { text: 'In the beginning God created the heavens and the _____', answer: 'earth', options: ['earth', 'world', 'land', 'seas'], ref: 'Genesis 1:1' },
  { text: 'Trust in the Lord with all your _____', answer: 'heart', options: ['heart', 'soul', 'mind', 'strength'], ref: 'Proverbs 3:5' },
  { text: 'The _____ of the Lord is the beginning of wisdom', answer: 'fear', options: ['fear', 'love', 'word', 'grace'], ref: 'Proverbs 9:10' },
  { text: 'Be strong and _____', answer: 'courageous', options: ['courageous', 'faithful', 'humble', 'patient'], ref: 'Joshua 1:9' },
  { text: 'The Lord is my light and my _____', answer: 'salvation', options: ['salvation', 'hope', 'shield', 'fortress'], ref: 'Psalm 27:1' },
  { text: 'Love is patient, love is _____', answer: 'kind', options: ['kind', 'gentle', 'strong', 'pure'], ref: 'I Corinthians 13:4' },
  { text: 'For I know the _____ I have for you', answer: 'plans', options: ['plans', 'love', 'hope', 'grace'], ref: 'Jeremiah 29:11' },
  { text: 'Be still and know that I am _____', answer: 'God', options: ['God', 'Lord', 'here', 'near'], ref: 'Psalm 46:10' },
  { text: 'The _____ is a lamp to my feet', answer: 'word', options: ['word', 'light', 'Lord', 'truth'], ref: 'Psalm 119:105' },
  { text: 'Blessed are the _____ in spirit', answer: 'poor', options: ['poor', 'rich', 'strong', 'pure'], ref: 'Matthew 5:3' },
  { text: 'Come to me, all you who are weary and _____', answer: 'burdened', options: ['burdened', 'broken', 'lonely', 'lost'], ref: 'Matthew 11:28' },
  { text: 'Ask and it will be _____ to you', answer: 'given', options: ['given', 'shown', 'revealed', 'opened'], ref: 'Matthew 7:7' },
  { text: 'Do not be _____, for I am with you', answer: 'afraid', options: ['afraid', 'anxious', 'troubled', 'worried'], ref: 'Isaiah 41:10' },
  { text: 'The joy of the Lord is my _____', answer: 'strength', options: ['strength', 'hope', 'shield', 'refuge'], ref: 'Nehemiah 8:10' },
  { text: 'God is our _____ and strength', answer: 'refuge', options: ['refuge', 'shield', 'rock', 'hope'], ref: 'Psalm 46:1' },
  { text: 'Create in me a _____ heart, O God', answer: 'clean', options: ['clean', 'new', 'pure', 'humble'], ref: 'Psalm 51:10' },
  { text: 'He makes me lie down in _____ pastures', answer: 'green', options: ['green', 'quiet', 'peaceful', 'still'], ref: 'Psalm 23:2' },
  { text: 'I am the way, the truth, and the _____', answer: 'life', options: ['life', 'light', 'door', 'vine'], ref: 'John 14:6' },
  { text: 'For where your treasure is, there your _____ will be also', answer: 'heart', options: ['heart', 'mind', 'soul', 'hope'], ref: 'Matthew 6:21' },
  { text: 'And now these three remain: faith, hope, and _____', answer: 'love', options: ['love', 'grace', 'joy', 'peace'], ref: 'I Corinthians 13:13' },
  { text: 'I am the vine; you are the _____', answer: 'branches', options: ['branches', 'fruit', 'leaves', 'roots'], ref: 'John 15:5' },
  { text: 'But the fruit of the Spirit is love, joy, _____', answer: 'peace', options: ['peace', 'hope', 'grace', 'faith'], ref: 'Galatians 5:22' },
  { text: 'Do not let your hearts be _____', answer: 'troubled', options: ['troubled', 'afraid', 'anxious', 'heavy'], ref: 'John 14:1' },
  { text: 'He heals the _____ and binds up their wounds', answer: 'brokenhearted', options: ['brokenhearted', 'sick', 'wounded', 'faithful'], ref: 'Psalm 147:3' },
  { text: 'Your word is a lamp for my feet, a light on my _____', answer: 'path', options: ['path', 'way', 'road', 'journey'], ref: 'Psalm 119:105' },
  { text: 'Cast all your _____ on him because he cares for you', answer: 'anxiety', options: ['anxiety', 'burdens', 'worries', 'fears'], ref: '1 Peter 5:7' },
  { text: 'The Lord is _____ to the brokenhearted', answer: 'close', options: ['close', 'kind', 'faithful', 'good'], ref: 'Psalm 34:18' },
  { text: 'Do everything in _____ and good order', answer: 'love', options: ['love', 'peace', 'faith', 'hope'], ref: '1 Corinthians 16:14' },
  { text: 'Delight yourself in the Lord, and he will give you the desires of your _____', answer: 'heart', options: ['heart', 'soul', 'mind', 'life'], ref: 'Psalm 37:4' },
  { text: 'But those who _____ in the Lord will renew their strength', answer: 'hope', options: ['hope', 'trust', 'believe', 'rest'], ref: 'Isaiah 40:31' },
  { text: 'The Lord your God is with you, the mighty warrior who _____', answer: 'saves', options: ['saves', 'fights', 'protects', 'leads'], ref: 'Zephaniah 3:17' },
  { text: 'In all your ways submit to him, and he will make your paths _____', answer: 'straight', options: ['straight', 'clear', 'bright', 'safe'], ref: 'Proverbs 3:6' },
  { text: 'I have told you these things, so that in me you may have _____', answer: 'peace', options: ['peace', 'joy', 'hope', 'life'], ref: 'John 16:33' },
  { text: 'Let everything that has breath _____ the Lord', answer: 'praise', options: ['praise', 'serve', 'love', 'seek'], ref: 'Psalm 150:6' },
  { text: 'For we walk by _____, not by sight', answer: 'faith', options: ['faith', 'grace', 'hope', 'love'], ref: '2 Corinthians 5:7' },
  { text: 'The Lord is my rock, my fortress and my _____', answer: 'deliverer', options: ['deliverer', 'saviour', 'protector', 'helper'], ref: 'Psalm 18:2' },
  { text: 'Give thanks to the Lord, for he is _____', answer: 'good', options: ['good', 'great', 'holy', 'faithful'], ref: 'Psalm 107:1' },
  { text: 'You are the _____ of the world', answer: 'light', options: ['light', 'salt', 'hope', 'joy'], ref: 'Matthew 5:14' },
  { text: 'Seek first his kingdom and his _____', answer: 'righteousness', options: ['righteousness', 'glory', 'will', 'grace'], ref: 'Matthew 6:33' },
  { text: 'Though I walk through the darkest _____, I will fear no evil', answer: 'valley', options: ['valley', 'night', 'storm', 'shadow'], ref: 'Psalm 23:4' },
  { text: 'Do not conform to the pattern of this _____', answer: 'world', options: ['world', 'age', 'life', 'time'], ref: 'Romans 12:2' },
  { text: 'By _____ you have been saved, through faith', answer: 'grace', options: ['grace', 'God', 'love', 'mercy'], ref: 'Ephesians 2:8' },
  { text: 'For God has not given us a spirit of _____', answer: 'fear', options: ['fear', 'doubt', 'weakness', 'anger'], ref: '2 Timothy 1:7' },
  { text: 'The earth is the Lord\'s, and everything in _____', answer: 'it', options: ['it', 'life', 'nature', 'sight'], ref: 'Psalm 24:1' },
  { text: 'He who began a good work in you will carry it on to _____', answer: 'completion', options: ['completion', 'perfection', 'glory', 'victory'], ref: 'Philippians 1:6' },
  { text: 'If God is for us, who can be _____ us', answer: 'against', options: ['against', 'above', 'before', 'beside'], ref: 'Romans 8:31' },
  { text: 'I have been _____ with Christ', answer: 'crucified', options: ['crucified', 'raised', 'blessed', 'saved'], ref: 'Galatians 2:20' },
  { text: 'And my God will meet all your _____ according to the riches of his glory', answer: 'needs', options: ['needs', 'desires', 'prayers', 'hopes'], ref: 'Philippians 4:19' },
  { text: 'Do not be overcome by evil, but overcome evil with _____', answer: 'good', options: ['good', 'love', 'faith', 'prayer'], ref: 'Romans 12:21' },
  { text: 'In the beginning was the _____, and the Word was with God', answer: 'Word', options: ['Word', 'light', 'truth', 'way'], ref: 'John 1:1' },
  { text: 'The Lord is gracious and _____, slow to anger and rich in love', answer: 'compassionate', options: ['compassionate', 'merciful', 'faithful', 'righteous'], ref: 'Psalm 145:8' },
  { text: 'Train up a child in the way he should go, and when he is old he will not _____ from it', answer: 'depart', options: ['depart', 'stray', 'turn', 'fall'], ref: 'Proverbs 22:6' },
  { text: 'I am the good _____. The good shepherd lays down his life for the sheep', answer: 'shepherd', options: ['shepherd', 'leader', 'master', 'father'], ref: 'John 10:11' },
  { text: 'The Lord bless you and _____ you', answer: 'keep', options: ['keep', 'guide', 'love', 'heal'], ref: 'Numbers 6:24' },
  { text: 'How good and pleasant it is when God\'s people live together in _____', answer: 'unity', options: ['unity', 'peace', 'harmony', 'love'], ref: 'Psalm 133:1' },
  { text: 'A gentle answer turns away _____, but a harsh word stirs up anger', answer: 'wrath', options: ['wrath', 'evil', 'strife', 'hate'], ref: 'Proverbs 15:1' },
  { text: 'For we are God\'s handiwork, created in Christ Jesus to do good _____', answer: 'works', options: ['works', 'deeds', 'things', 'service'], ref: 'Ephesians 2:10' },
  { text: 'The name of the Lord is a fortified _____; the righteous run to it and are safe', answer: 'tower', options: ['tower', 'wall', 'city', 'fortress'], ref: 'Proverbs 18:10' },
  { text: 'He who dwells in the shelter of the Most High will rest in the _____ of the Almighty', answer: 'shadow', options: ['shadow', 'arms', 'peace', 'light'], ref: 'Psalm 91:1' },
  { text: 'Do not worry about _____, for tomorrow will worry about itself', answer: 'tomorrow', options: ['tomorrow', 'anything', 'the future', 'your life'], ref: 'Matthew 6:34' },
  { text: 'Greater _____ has no one than this: to lay down one\'s life for one\'s friends', answer: 'love', options: ['love', 'faith', 'honour', 'sacrifice'], ref: 'John 15:13' },
  { text: 'All _____ is God-breathed and is useful for teaching', answer: 'Scripture', options: ['Scripture', 'wisdom', 'truth', 'prophecy'], ref: '2 Timothy 3:16' },
  { text: 'Wait for the Lord; be strong and take _____ and wait for the Lord', answer: 'heart', options: ['heart', 'courage', 'hope', 'rest'], ref: 'Psalm 27:14' },
  { text: 'The heavens declare the _____ of God', answer: 'glory', options: ['glory', 'power', 'love', 'majesty'], ref: 'Psalm 19:1' },
  { text: 'Whoever wants to be my disciple must deny themselves and take up their _____', answer: 'cross', options: ['cross', 'sword', 'shield', 'faith'], ref: 'Matthew 16:24' },
  { text: 'Enter his gates with thanksgiving and his courts with _____', answer: 'praise', options: ['praise', 'joy', 'worship', 'singing'], ref: 'Psalm 100:4' },
  { text: 'Man shall not live on bread alone, but on every _____ that comes from the mouth of God', answer: 'word', options: ['word', 'truth', 'blessing', 'command'], ref: 'Matthew 4:4' },
  { text: 'The wages of sin is death, but the gift of God is _____ life in Christ Jesus', answer: 'eternal', options: ['eternal', 'abundant', 'new', 'blessed'], ref: 'Romans 6:23' },
  { text: 'Commit your way to the Lord; _____ in him and he will do this', answer: 'trust', options: ['trust', 'believe', 'hope', 'rest'], ref: 'Psalm 37:5' },
  { text: 'I will _____ the Lord at all times; his praise will always be on my lips', answer: 'praise', options: ['praise', 'serve', 'love', 'seek'], ref: 'Psalm 34:1' },
  { text: 'Be kind and _____ to one another, forgiving each other', answer: 'compassionate', options: ['compassionate', 'gentle', 'loving', 'patient'], ref: 'Ephesians 4:32' },
  { text: 'No weapon forged against you will _____, and you will refute every tongue that accuses you', answer: 'prevail', options: ['prevail', 'prosper', 'succeed', 'stand'], ref: 'Isaiah 54:17' },
  { text: 'Jesus wept. This is the _____ verse in the Bible', answer: 'shortest', options: ['shortest', 'saddest', 'oldest', 'greatest'], ref: 'John 11:35' },
  { text: 'As iron sharpens iron, so one person sharpens _____', answer: 'another', options: ['another', 'himself', 'the soul', 'their mind'], ref: 'Proverbs 27:17' },
  { text: 'Have I not commanded you? Be strong and _____. Do not be afraid', answer: 'courageous', options: ['courageous', 'faithful', 'steadfast', 'bold'], ref: 'Joshua 1:9' },
  { text: 'Do not quench the _____', answer: 'Spirit', options: ['Spirit', 'fire', 'light', 'truth'], ref: '1 Thessalonians 5:19' },
  { text: 'God is _____, and his love endures for ever', answer: 'good', options: ['good', 'great', 'holy', 'faithful'], ref: 'Psalm 100:5' },
  { text: 'Therefore, if anyone is in Christ, the new creation has come: the _____ has gone', answer: 'old', options: ['old', 'past', 'sin', 'darkness'], ref: '2 Corinthians 5:17' },
  { text: 'Above all else, guard your _____, for everything you do flows from it', answer: 'heart', options: ['heart', 'mind', 'soul', 'tongue'], ref: 'Proverbs 4:23' },
  { text: 'I am the bread of _____. Whoever comes to me will never go hungry', answer: 'life', options: ['life', 'heaven', 'God', 'truth'], ref: 'John 6:35' },
  { text: 'Let the morning bring me word of your unfailing _____', answer: 'love', options: ['love', 'grace', 'mercy', 'peace'], ref: 'Psalm 143:8' },
  { text: 'Children, _____ your parents in the Lord, for this is right', answer: 'obey', options: ['obey', 'honour', 'love', 'respect'], ref: 'Ephesians 6:1' },
  { text: 'Come now, let us _____ together, says the Lord', answer: 'settle', options: ['settle', 'reason', 'worship', 'pray'], ref: 'Isaiah 1:18' },
  { text: 'Taste and see that the Lord is _____', answer: 'good', options: ['good', 'great', 'holy', 'faithful'], ref: 'Psalm 34:8' },
  { text: 'The Lord is my _____ and my song; he has become my salvation', answer: 'strength', options: ['strength', 'rock', 'shield', 'hope'], ref: 'Exodus 15:2' },
  { text: 'Your faith has _____ you. Go in peace', answer: 'healed', options: ['healed', 'saved', 'freed', 'blessed'], ref: 'Luke 8:48' },
  { text: 'He leads me beside _____ waters', answer: 'quiet', options: ['quiet', 'still', 'peaceful', 'calm'], ref: 'Psalm 23:2' },
  { text: 'Set your minds on things _____, not on earthly things', answer: 'above', options: ['above', 'heavenly', 'spiritual', 'eternal'], ref: 'Colossians 3:2' },
  { text: 'A friend loves at all _____, and a brother is born for a time of adversity', answer: 'times', options: ['times', 'costs', 'hours', 'moments'], ref: 'Proverbs 17:17' },
  { text: 'Blessed is the nation whose God is the _____', answer: 'Lord', options: ['Lord', 'Almighty', 'Saviour', 'King'], ref: 'Psalm 33:12' },
  { text: 'I press on toward the _____ to win the prize for which God has called me', answer: 'goal', options: ['goal', 'mark', 'finish', 'crown'], ref: 'Philippians 3:14' },
  { text: 'Now faith is confidence in what we hope for and _____ about what we do not see', answer: 'assurance', options: ['assurance', 'certainty', 'trust', 'belief'], ref: 'Hebrews 11:1' },
  { text: 'The Lord is faithful, and he will _____ you and protect you from the evil one', answer: 'strengthen', options: ['strengthen', 'guard', 'keep', 'shield'], ref: '2 Thessalonians 3:3' },
  { text: 'Consider it pure _____ whenever you face trials of many kinds', answer: 'joy', options: ['joy', 'faith', 'grace', 'blessing'], ref: 'James 1:2' },
  { text: 'But God demonstrates his own love for us in this: while we were still _____, Christ died for us', answer: 'sinners', options: ['sinners', 'lost', 'broken', 'weak'], ref: 'Romans 5:8' },
  { text: 'You are the _____ of the earth. But if the salt loses its saltiness, how can it be made salty again', answer: 'salt', options: ['salt', 'light', 'hope', 'joy'], ref: 'Matthew 5:13' },
  { text: 'And we know that in all things God works for the _____ of those who love him', answer: 'good', options: ['good', 'glory', 'benefit', 'joy'], ref: 'Romans 8:28' },
  { text: 'The tongue has the power of life and _____', answer: 'death', options: ['death', 'destruction', 'darkness', 'despair'], ref: 'Proverbs 18:21' },
  { text: 'Be _____ and know that I am God', answer: 'still', options: ['still', 'quiet', 'calm', 'patient'], ref: 'Psalm 46:10' },
  { text: 'Humble yourselves before the Lord, and he will _____ you up', answer: 'lift', options: ['lift', 'raise', 'build', 'hold'], ref: 'James 4:10' },
  { text: 'The thief comes only to steal and kill and _____', answer: 'destroy', options: ['destroy', 'deceive', 'divide', 'devour'], ref: 'John 10:10' },
  { text: 'Put on the full _____ of God, so that you can take your stand against the devil\'s schemes', answer: 'armour', options: ['armour', 'power', 'shield', 'glory'], ref: 'Ephesians 6:11' },
  { text: 'In everything give _____, for this is the will of God in Christ Jesus for you', answer: 'thanks', options: ['thanks', 'praise', 'glory', 'worship'], ref: '1 Thessalonians 5:18' },
  { text: 'If we _____ our sins, he is faithful and just and will forgive us our sins', answer: 'confess', options: ['confess', 'repent', 'acknowledge', 'regret'], ref: '1 John 1:9' },
  { text: 'For the Spirit God gave us does not make us timid, but gives us power, love and _____', answer: 'self-discipline', options: ['self-discipline', 'wisdom', 'courage', 'patience'], ref: '2 Timothy 1:7' },
  { text: 'The Lord is _____ to all who call on him, to all who call on him in truth', answer: 'near', options: ['near', 'faithful', 'good', 'kind'], ref: 'Psalm 145:18' },
  { text: 'Where there is no _____, the people perish', answer: 'vision', options: ['vision', 'hope', 'faith', 'leader'], ref: 'Proverbs 29:18' },
  { text: 'Blessed are the peacemakers, for they will be called children of _____', answer: 'God', options: ['God', 'light', 'heaven', 'peace'], ref: 'Matthew 5:9' },
  { text: 'He restores my _____. He guides me along the right paths for his name\'s sake', answer: 'soul', options: ['soul', 'heart', 'spirit', 'strength'], ref: 'Psalm 23:3' },
  { text: 'Surely your goodness and love will follow me all the _____ of my life', answer: 'days', options: ['days', 'years', 'moments', 'seasons'], ref: 'Psalm 23:6' },
  { text: 'With God all things are _____', answer: 'possible', options: ['possible', 'certain', 'good', 'wonderful'], ref: 'Matthew 19:26' },
  { text: 'Be joyful in _____, patient in affliction, faithful in prayer', answer: 'hope', options: ['hope', 'faith', 'love', 'spirit'], ref: 'Romans 12:12' },
  { text: 'O Lord, you are my God; I will _____ you and praise your name', answer: 'exalt', options: ['exalt', 'worship', 'serve', 'honour'], ref: 'Isaiah 25:1' },
  { text: 'Let us not become weary in doing _____, for at the proper time we will reap a harvest', answer: 'good', options: ['good', 'right', 'service', 'work'], ref: 'Galatians 6:9' },
  { text: 'I lift up my eyes to the mountains—where does my _____ come from', answer: 'help', options: ['help', 'hope', 'strength', 'peace'], ref: 'Psalm 121:1' },
  { text: 'For what shall it profit a man, if he shall gain the whole world, and lose his own _____', answer: 'soul', options: ['soul', 'life', 'heart', 'mind'], ref: 'Mark 8:36' },
  { text: 'Rejoice in the Lord always. I will say it again: _____!', answer: 'Rejoice', options: ['Rejoice', 'Praise', 'Believe', 'Worship'], ref: 'Philippians 4:4' },
  { text: 'Draw near to God and he will draw near to _____', answer: 'you', options: ['you', 'us', 'his people', 'the faithful'], ref: 'James 4:8' },
  { text: 'My grace is sufficient for you, for my power is made perfect in _____', answer: 'weakness', options: ['weakness', 'faith', 'humility', 'suffering'], ref: '2 Corinthians 12:9' },
  { text: 'I have hidden your _____ in my heart that I might not sin against you', answer: 'word', options: ['word', 'love', 'truth', 'law'], ref: 'Psalm 119:11' },
  { text: 'The Lord will fight for you; you need only to be _____', answer: 'still', options: ['still', 'faithful', 'patient', 'brave'], ref: 'Exodus 14:14' },
  { text: 'Let the peace of Christ rule in your _____', answer: 'hearts', options: ['hearts', 'minds', 'souls', 'lives'], ref: 'Colossians 3:15' },
  { text: 'Come to me, all you who are weary and burdened, and I will give you _____', answer: 'rest', options: ['rest', 'peace', 'strength', 'hope'], ref: 'Matthew 11:28' },
  { text: 'Therefore go and make _____ of all nations', answer: 'disciples', options: ['disciples', 'believers', 'followers', 'friends'], ref: 'Matthew 28:19' },
  { text: 'For the Lord God is a sun and _____', answer: 'shield', options: ['shield', 'sword', 'tower', 'refuge'], ref: 'Psalm 84:11' },
  { text: 'In all things we are more than _____ through him who loved us', answer: 'conquerors', options: ['conquerors', 'victors', 'champions', 'warriors'], ref: 'Romans 8:37' },
  { text: 'Be completely humble and _____, bearing with one another in love', answer: 'gentle', options: ['gentle', 'patient', 'kind', 'faithful'], ref: 'Ephesians 4:2' },
  { text: 'The righteous person may have many troubles, but the Lord _____ him from them all', answer: 'delivers', options: ['delivers', 'protects', 'saves', 'shields'], ref: 'Psalm 34:19' },
  { text: 'Do not be anxious about _____, but in every situation, by prayer and petition, present your requests to God', answer: 'anything', options: ['anything', 'tomorrow', 'the future', 'your life'], ref: 'Philippians 4:6' },
  { text: 'This is the day the Lord has made; let us rejoice and be _____ in it', answer: 'glad', options: ['glad', 'joyful', 'thankful', 'blessed'], ref: 'Psalm 118:24' },
  { text: 'You prepare a _____ before me in the presence of my enemies', answer: 'table', options: ['table', 'feast', 'place', 'path'], ref: 'Psalm 23:5' },
  { text: 'The Lord is my helper; I will not be _____', answer: 'afraid', options: ['afraid', 'shaken', 'moved', 'troubled'], ref: 'Hebrews 13:6' },
  { text: 'Every good and perfect _____ is from above, coming down from the Father of heavenly lights', answer: 'gift', options: ['gift', 'blessing', 'promise', 'word'], ref: 'James 1:17' },
  { text: 'May the God of hope fill you with all joy and _____ as you trust in him', answer: 'peace', options: ['peace', 'love', 'grace', 'strength'], ref: 'Romans 15:13' },
  { text: 'In him we have _____ through his blood, the forgiveness of sins', answer: 'redemption', options: ['redemption', 'salvation', 'freedom', 'victory'], ref: 'Ephesians 1:7' },
  { text: 'He has made everything _____ in its time', answer: 'beautiful', options: ['beautiful', 'perfect', 'wonderful', 'good'], ref: 'Ecclesiastes 3:11' },
  { text: 'Submit yourselves, then, to God. Resist the _____, and he will flee from you', answer: 'devil', options: ['devil', 'enemy', 'tempter', 'wicked'], ref: 'James 4:7' },
  { text: 'Weeping may stay for the night, but _____ comes in the morning', answer: 'rejoicing', options: ['rejoicing', 'hope', 'peace', 'healing'], ref: 'Psalm 30:5' },
  { text: 'The grass withers and the flowers fall, but the word of our God endures _____', answer: 'forever', options: ['forever', 'always', 'eternally', 'still'], ref: 'Isaiah 40:8' },
  { text: 'Whoever believes in me, as Scripture has said, rivers of living _____ will flow from within them', answer: 'water', options: ['water', 'light', 'spirit', 'faith'], ref: 'John 7:38' },
  { text: 'A new _____ I give you: Love one another. As I have loved you, so you must love one another', answer: 'command', options: ['command', 'covenant', 'promise', 'law'], ref: 'John 13:34' },
  { text: 'The Lord gives _____ to those who are weary and increases the power of the weak', answer: 'strength', options: ['strength', 'hope', 'rest', 'grace'], ref: 'Isaiah 40:29' },
  { text: 'God opposes the proud but shows _____ to the humble', answer: 'favour', options: ['favour', 'grace', 'mercy', 'love'], ref: 'James 4:6' },
  { text: 'How great is the love the Father has _____ on us, that we should be called children of God', answer: 'lavished', options: ['lavished', 'bestowed', 'given', 'poured'], ref: '1 John 3:1' },
  { text: 'I will instruct you and teach you in the way you should go; I will _____ you with my loving eye on you', answer: 'counsel', options: ['counsel', 'guide', 'lead', 'direct'], ref: 'Psalm 32:8' },
  { text: 'The Lord watches over the _____ of the righteous', answer: 'way', options: ['way', 'path', 'life', 'steps'], ref: 'Psalm 1:6' },
  { text: 'They will soar on wings like _____', answer: 'eagles', options: ['eagles', 'doves', 'angels', 'hawks'], ref: 'Isaiah 40:31' },
  { text: 'Do to others as you would have them do to _____', answer: 'you', options: ['you', 'them', 'others', 'all'], ref: 'Luke 6:31' },
  { text: 'The Lord is slow to anger, abounding in love and forgiving sin and _____', answer: 'rebellion', options: ['rebellion', 'wickedness', 'iniquity', 'trespass'], ref: 'Numbers 14:18' },
  { text: 'God is our _____, an ever-present help in trouble', answer: 'refuge', options: ['refuge', 'fortress', 'shield', 'rock'], ref: 'Psalm 46:1' },
  { text: 'Blessed are those who _____ and thirst for righteousness, for they will be filled', answer: 'hunger', options: ['hunger', 'seek', 'pray', 'long'], ref: 'Matthew 5:6' },
  { text: 'Be on your _____, stand firm in the faith, be courageous, be strong', answer: 'guard', options: ['guard', 'knees', 'watch', 'way'], ref: '1 Corinthians 16:13' },
  { text: 'One thing I ask from the Lord, this only do I _____: that I may dwell in the house of the Lord', answer: 'seek', options: ['seek', 'desire', 'pray', 'hope'], ref: 'Psalm 27:4' },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getShuffledOptions(verse) {
  return shuffleArray(verse.options);
}

export default function VerseCompleteGame() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const [verseQueue, setVerseQueue] = useState(() => {
    const q = shuffleArray(VERSES);
    return q;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [gameState, setGameState] = useState('playing');
  const [timeLeft, setTimeLeft] = useState(15);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  const timerRef = useRef(null);
  const advanceTimeoutRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const streakAnim = useRef(new Animated.Value(1)).current;
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const resultScaleAnim = useRef(new Animated.Value(0)).current;

  const showResultRef = useRef(showResult);
  const gameStateRef = useRef(gameState);
  const roundRef = useRef(round);
  useEffect(() => { showResultRef.current = showResult; }, [showResult]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { roundRef.current = round; }, [round]);

  const currentVerse = verseQueue[currentIndex % verseQueue.length];

  useEffect(() => {
    setShuffledOptions(getShuffledOptions(verseQueue[0]));
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [currentIndex]);

  const startTimer = useCallback(() => {
    const currentRound = roundRef.current;
    const timerDuration = currentRound <= 15 ? 15 : currentRound <= 30 ? 12 : 10;
    clearInterval(timerRef.current);
    setTimeLeft(timerDuration);
    timerBarAnim.setValue(1);

    Animated.timing(timerBarAnim, {
      toValue: 0,
      duration: timerDuration * 1000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentIndex]);

  const handleTimeout = useCallback(() => {
    if (showResultRef.current || gameStateRef.current !== 'playing') return;
    hapticFeedback.warning();
    setSelectedAnswer('__timeout__');
    setShowResult(true);
    setStreak(0);
    setTotalAnswered(prev => prev + 1);

    resultScaleAnim.setValue(0);
    Animated.spring(resultScaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();

    advanceTimeoutRef.current = setTimeout(() => advanceRound(), 2000);
  }, [advanceRound]);

  const handleAnswer = useCallback((option) => {
    if (showResultRef.current || gameStateRef.current !== 'playing') return;
    clearInterval(timerRef.current);
    hapticFeedback.light();

    setSelectedAnswer(option);
    setShowResult(true);
    setTotalAnswered(prev => prev + 1);

    const isCorrect = option === currentVerse.answer;

    resultScaleAnim.setValue(0);
    Animated.spring(resultScaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();

    if (isCorrect) {
      hapticFeedback.success();
      const timeBonus = Math.round(timeLeft * 3);
      const streakBonus = streak >= 5 ? 50 : streak >= 3 ? 25 : 0;
      setScore(prev => prev + 100 + timeBonus + streakBonus);
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
      setTotalCorrect(prev => prev + 1);

      Animated.sequence([
        Animated.timing(streakAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(streakAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      hapticFeedback.error();
      setStreak(0);
    }

    advanceTimeoutRef.current = setTimeout(() => advanceRound(), 1800);
  }, [currentVerse, timeLeft, streak, bestStreak, advanceRound]);

  const advanceRound = useCallback(() => {
    clearTimeout(advanceTimeoutRef.current);
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      const nextIndex = currentIndex + 1;

      if (nextIndex >= verseQueue.length) {
        const newQueue = shuffleArray(VERSES);
        setVerseQueue(newQueue);
        setCurrentIndex(0);
        setShuffledOptions(getShuffledOptions(newQueue[0]));
      } else {
        setCurrentIndex(nextIndex);
        setShuffledOptions(getShuffledOptions(verseQueue[nextIndex]));
      }

      setRound(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);

      slideAnim.setValue(30);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  }, [currentIndex, verseQueue]);

  const resetGame = useCallback(() => {
    hapticFeedback.medium();
    clearInterval(timerRef.current);
    clearTimeout(advanceTimeoutRef.current);
    const newQueue = shuffleArray(VERSES);
    setVerseQueue(newQueue);
    setCurrentIndex(0);
    setShuffledOptions(getShuffledOptions(newQueue[0]));
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setRound(1);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameState('playing');
    setTimeLeft(15);
    setTotalCorrect(0);
    setTotalAnswered(0);
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
  }, []);

  const endGame = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(advanceTimeoutRef.current);
    setGameState('over');
  }, []);

  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const getOptionStyle = (option) => {
    if (!showResult) {
      return {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
      };
    }
    if (option === currentVerse.answer) {
      return {
        backgroundColor: (theme.success || '#66BB6A') + '20',
        borderColor: theme.success || '#66BB6A',
      };
    }
    if (option === selectedAnswer && option !== currentVerse.answer) {
      return {
        backgroundColor: (theme.error || '#EF5350') + '20',
        borderColor: theme.error || '#EF5350',
      };
    }
    return {
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    };
  };

  const getOptionTextColor = (option) => {
    if (!showResult) return theme.text;
    if (option === currentVerse.answer) return theme.success || '#66BB6A';
    if (option === selectedAnswer) return theme.error || '#EF5350';
    return theme.textTertiary || theme.textSecondary;
  };

  if (gameState === 'over') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialIcons name="chevron-left" size={30} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Verse Complete</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.gameOverContainer}>
          <MaterialIcons name="auto-stories" size={72} color={theme.primary} />
          <Text style={[styles.gameOverTitle, { color: theme.text }]}>Well Done!</Text>

          <View style={[styles.finalScoreBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.finalScoreLabel, { color: theme.textSecondary }]}>Final Score</Text>
            <Text style={[styles.finalScoreValue, { color: theme.primary }]}>{score.toLocaleString()}</Text>
          </View>

          <View style={[styles.statsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{round - 1}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rounds</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{accuracy}%</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Accuracy</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{bestStreak}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Best Streak</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.playAgainButton, { backgroundColor: theme.primary }]} onPress={resetGame} activeOpacity={0.8}>
            <MaterialIcons name="replay" size={22} color="#FFFFFF" />
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.exitButton, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.exitButtonText, { color: theme.textSecondary }]}>Exit Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const timerBarWidth = timerBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const timerColor = timeLeft <= 5 ? (theme.error || '#EF5350') : timeLeft <= 10 ? (theme.warning || '#FFD54F') : theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="chevron-left" size={30} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Verse Complete</Text>
        <TouchableOpacity onPress={endGame} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="stop-circle" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <MaterialIcons name="score" size={16} color={theme.primary} />
          <Text style={[styles.statBadgeText, { color: theme.text }]}>{score}</Text>
        </View>
        <Animated.View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', transform: [{ scale: streakAnim }] }]}>
          <MaterialIcons name="local-fire-department" size={16} color={streak >= 3 ? '#FF9500' : theme.textSecondary} />
          <Text style={[styles.statBadgeText, { color: streak >= 3 ? '#FF9500' : theme.text }]}>{streak}</Text>
        </Animated.View>
        <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.statBadgeText, { color: theme.textSecondary }]}>Rd {round}</Text>
        </View>
      </View>

      <View style={[styles.timerBarContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        <Animated.View style={[styles.timerBar, { width: timerBarWidth, backgroundColor: timerColor }]} />
      </View>

      <ScrollView style={styles.gameArea} contentContainerStyle={styles.gameContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[styles.verseCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.verseText, { color: theme.text }]}>
              {currentVerse.text.split('_____').map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <Text style={[styles.blankText, { color: theme.primary }]}>
                      {showResult ? currentVerse.answer : ' _____ '}
                    </Text>
                  )}
                </React.Fragment>
              ))}
            </Text>
            <Text style={[styles.verseRef, { color: theme.primary }]}>{currentVerse.ref}</Text>
          </View>

          {showResult && (
            <Animated.View style={[
              styles.resultBanner,
              {
                backgroundColor: (selectedAnswer === currentVerse.answer ? (theme.success || '#66BB6A') : (theme.error || '#EF5350')) + '15',
                borderColor: (selectedAnswer === currentVerse.answer ? (theme.success || '#66BB6A') : (theme.error || '#EF5350')) + '40',
                transform: [{ scale: resultScaleAnim }],
              },
            ]}>
              <MaterialIcons
                name={selectedAnswer === currentVerse.answer ? 'check-circle' : (selectedAnswer === '__timeout__' ? 'timer-off' : 'cancel')}
                size={20}
                color={selectedAnswer === currentVerse.answer ? (theme.success || '#66BB6A') : (theme.error || '#EF5350')}
              />
              <Text style={[styles.resultText, { color: selectedAnswer === currentVerse.answer ? (theme.success || '#66BB6A') : (theme.error || '#EF5350') }]}>
                {selectedAnswer === currentVerse.answer ? 'Correct!' : selectedAnswer === '__timeout__' ? 'Time\'s up!' : `The answer was "${currentVerse.answer}"`}
              </Text>
            </Animated.View>
          )}

          <View style={styles.optionsGrid}>
            {(shuffledOptions || []).map((option) => (
              <TouchableOpacity
                key={option}
                activeOpacity={0.7}
                disabled={showResult}
                onPress={() => handleAnswer(option)}
                style={[styles.optionButton, { borderWidth: 1.5 }, getOptionStyle(option)]}
              >
                {showResult && option === currentVerse.answer && (
                  <MaterialIcons name="check" size={18} color={theme.success || '#66BB6A'} style={{ marginRight: 6 }} />
                )}
                <Text style={[styles.optionText, { color: getOptionTextColor(option) }]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timerBarContainer: {
    height: 4,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timerBar: {
    height: '100%',
    borderRadius: 2,
  },
  gameArea: {
    flex: 1,
  },
  gameContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  verseCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  verseText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 30,
    textAlign: 'center',
  },
  blankText: {
    fontWeight: '800',
    fontSize: 21,
  },
  verseRef: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 14,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionsGrid: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
  },
  gameOverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 24,
  },
  finalScoreBox: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    width: '100%',
  },
  finalScoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  finalScoreValue: {
    fontSize: 42,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 28,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 12,
  },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    marginBottom: 12,
  },
  playAgainText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  exitButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
