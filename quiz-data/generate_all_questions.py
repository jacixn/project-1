#!/usr/bin/env python3
"""
Generate comprehensive Bible quiz questions for all categories
Target: ~50 questions per category (30-35 MC + 15-20 TF)
"""
import json

def mc(id, q, opts, correct, expl, ref, pts=10):
    """Create multiple choice question"""
    return {
        "id": id, "question": q, "options": opts,
        "correctAnswer": correct, "explanation": expl,
        "reference": ref, "points": pts
    }

def tf(id, q, correct, expl, ref, pts=5):
    """Create true/false question"""
    return {
        "id": id, "question": q, "correctAnswer": correct,
        "explanation": expl, "reference": ref, "points": pts
    }

print("📖 Generating comprehensive Bible quiz questions...")

# Load existing questions
with open('questions.json', 'r') as f:
    data = json.load(f)

# Keep New Testament as-is (already has 100)

# EXPAND OLD TESTAMENT TO 50 QUESTIONS
print("Adding Old Testament questions...")
data["old-testament"]["multiple-choice"]["beginner"].extend([
    mc("ot-mc-b-6", "Who led Israelites from Egypt?", ["Abraham", "Moses", "Joshua", "David"], 1, "Moses led the Israelites out of Egyptian slavery.", "Exodus 3:10"),
    mc("ot-mc-b-7", "How many plagues on Egypt?", ["7", "10", "12", "15"], 1, "God sent 10 plagues upon Egypt.", "Exodus 7-12"),
    mc("ot-mc-b-8", "Who received Ten Commandments?", ["Abraham", "Noah", "Moses", "David"], 2, "God gave Moses the Ten Commandments on Mount Sinai.", "Exodus 20:1-17"),
    mc("ot-mc-b-9", "What killed Goliath?", ["Sword", "Arrow", "Stone", "Spear"], 2, "David killed Goliath with a stone from his sling.", "1 Samuel 17:49"),
    mc("ot-mc-b-10", "Who was David's son?", ["Saul", "Solomon", "Samuel", "Absalom"], 1, "Solomon was David's son who became king.", "1 Kings 1:13"),
    mc("ot-mc-b-11", "First book of Bible?", ["Exodus", "Genesis", "Leviticus", "Numbers"], 1, "Genesis is the first book of the Bible.", "Genesis 1:1"),
    mc("ot-mc-b-12", "Who interpreted dreams?", ["Moses", "Daniel", "Isaiah", "Jeremiah"], 1, "Daniel interpreted dreams for kings.", "Daniel 2:19"),
    mc("ot-mc-b-13", "Who was in lions den?", ["David", "Daniel", "Jonah", "Elijah"], 1, "Daniel was thrown into the lions den.", "Daniel 6:16"),
    mc("ot-mc-b-14", "Who was eaten by fish?", ["Jonah", "Daniel", "Elijah", "Elisha"], 0, "Jonah was swallowed by a great fish.", "Jonah 1:17"),
    mc("ot-mc-b-15", "Days in fish?", ["1", "2", "3", "7"], 2, "Jonah was in the fish for three days and nights.", "Jonah 1:17"),
    mc("ot-mc-b-16", "Who parted Red Sea?", ["Moses", "Joshua", "Abraham", "Noah"], 0, "God parted the Red Sea through Moses.", "Exodus 14:21"),
    mc("ot-mc-b-17", "Brothers of Joseph?", ["2", "7", "11", "12"], 2, "Joseph had 11 brothers (12 sons of Jacob total).", "Genesis 35:22"),
    mc("ot-mc-b-18", "Who fought walls of Jericho?", ["Moses", "Joshua", "David", "Samson"], 1, "Joshua led the battle of Jericho.", "Joshua 6:20"),
    mc("ot-mc-b-19", "Queen who visited Solomon?", ["Esther", "Ruth", "Sheba", "Deborah"], 2, "The Queen of Sheba visited Solomon.", "1 Kings 10:1"),
    mc("ot-mc-b-20", "Who was thrown in fiery furnace?", ["Daniel", "Shadrach Meshach Abednego", "Jeremiah", "Isaiah"], 1, "Shadrach, Meshach, and Abednego were in the furnace.", "Daniel 3:20"),
    mc("ot-mc-b-21", "Samson's strength from?", ["Muscles", "Hair", "God", "Training"], 1, "Samson's strength came from his uncut hair.", "Judges 16:17"),
    mc("ot-mc-b-22", "Who built temple?", ["David", "Solomon", "Moses", "Joshua"], 1, "Solomon built the temple in Jerusalem.", "1 Kings 6:1"),
    mc("ot-mc-b-23", "Abraham's wife?", ["Rachel", "Sarah", "Rebekah", "Leah"], 1, "Sarah was Abraham's wife.", "Genesis 17:15"),
    mc("ot-mc-b-24", "Isaac's son?", ["Joseph", "Jacob", "Esau", "Both B and C"], 3, "Isaac had twin sons: Jacob and Esau.", "Genesis 25:24-26"),
    mc("ot-mc-b-25", "Who sold for silver?", ["Joseph", "David", "Daniel", "Moses"], 0, "Joseph was sold by his brothers for silver.", "Genesis 37:28"),
    mc("ot-mc-b-26", "Days to create world?", ["3", "6", "7", "10"], 1, "God created the world in 6 days and rested on the 7th.", "Genesis 1"),
    mc("ot-mc-b-27", "First woman?", ["Sarah", "Eve", "Mary", "Ruth"], 1, "Eve was the first woman God created.", "Genesis 2:22"),
    mc("ot-mc-b-28", "Who built ark?", ["Moses", "Noah", "Abraham", "David"], 1, "Noah built the ark as commanded by God.", "Genesis 6:14"),
    mc("ot-mc-b-29", "Animals on ark?", ["One pair each", "Two pairs each", "Seven of some two of others", "Ten each"], 2, "Seven pairs of clean animals, two of unclean.", "Genesis 7:2"),
    mc("ot-mc-b-30", "Sign of covenant with Noah?", ["Star", "Rainbow", "Dove", "Cloud"], 1, "God put a rainbow as a sign of His covenant.", "Genesis 9:13"),
    mc("ot-mc-b-31", "Tower of?", ["Babel", "Jericho", "Jerusalem", "Siloam"], 0, "The Tower of Babel was built in rebellion.", "Genesis 11:4"),
    mc("ot-mc-b-32", "Abraham tested with?", ["Isaac", "Ishmael", "Jacob", "Esau"], 0, "God tested Abraham by asking for Isaac.", "Genesis 22:2"),
    mc("ot-mc-b-33", "Jacob's new name?", ["Israel", "Abraham", "Joseph", "Judah"], 0, "God renamed Jacob as Israel.", "Genesis 32:28"),
    mc("ot-mc-b-34", "Joseph's coat?", ["Red", "Blue", "Many colors", "White"], 2, "Joseph had a coat of many colors.", "Genesis 37:3"),
    mc("ot-mc-b-35", "Burning bush spoke to?", ["Abraham", "Moses", "Noah", "David"], 1, "God spoke to Moses from a burning bush.", "Exodus 3:4"),
])

data["old-testament"]["true-false"]["beginner"].extend([
    tf("ot-tf-b-4", "God created world in 7 days.", False, "False! God created in 6 days and rested on the 7th.", "Genesis 1-2"),
    tf("ot-tf-b-5", "Noah had three sons.", True, "True! Noah's sons were Shem, Ham, and Japheth.", "Genesis 6:10"),
    tf("ot-tf-b-6", "Moses wrote first 5 books.", True, "True! Moses wrote Genesis, Exodus, Leviticus, Numbers, and Deuteronomy.", "Traditional"),
    tf("ot-tf-b-7", "David was youngest son.", True, "True! David was Jesse's youngest son.", "1 Samuel 16:11"),
    tf("ot-tf-b-8", "Solomon was wisest king.", True, "True! God gave Solomon great wisdom.", "1 Kings 3:12"),
    tf("ot-tf-b-9", "Daniel ate king's food.", False, "False! Daniel refused the king's food and ate vegetables.", "Daniel 1:8"),
    tf("ot-tf-b-10", "Jonah went to Nineveh immediately.", False, "False! Jonah tried to run away first.", "Jonah 1:3"),
    tf("ot-tf-b-11", "Joseph became ruler in Egypt.", True, "True! Joseph became second in command in Egypt.", "Genesis 41:40"),
    tf("ot-tf-b-12", "Abraham had only one son.", False, "False! Abraham had Ishmael and Isaac (and others).", "Genesis 25:1-2"),
    tf("ot-tf-b-13", "Ten Commandments written on stone.", True, "True! God wrote them on stone tablets.", "Exodus 31:18"),
    tf("ot-tf-b-14", "Samson was a judge.", True, "True! Samson was one of Israel's judges.", "Judges 16:31"),
    tf("ot-tf-b-15", "Eve ate fruit first.", True, "True! Eve ate the forbidden fruit before Adam.", "Genesis 3:6"),
])

# EXPAND LIFE OF JESUS TO 50 QUESTIONS  
print("Adding Life of Jesus questions...")
# Ensure true-false section exists
if "true-false" not in data["life-of-jesus"]:
    data["life-of-jesus"]["true-false"] = {"beginner": []}

data["life-of-jesus"]["multiple-choice"]["beginner"].extend([
    mc("loj-mc-b-4", "Jesus born in?", ["Nazareth", "Jerusalem", "Bethlehem", "Capernaum"], 2, "Jesus was born in Bethlehem.", "Matthew 2:1"),
    mc("loj-mc-b-5", "Jesus baptized in?", ["Dead Sea", "Red Sea", "Jordan River", "Sea of Galilee"], 2, "Jesus was baptized in the Jordan River.", "Matthew 3:13"),
    mc("loj-mc-b-6", "Jesus tempted days?", ["7", "30", "40", "50"], 2, "Jesus was tempted for 40 days in the wilderness.", "Matthew 4:2"),
    mc("loj-mc-b-7", "First disciples called?", ["Matthew and Mark", "Peter and Andrew", "James and John", "Thomas and Philip"], 1, "Peter and Andrew were the first called.", "Matthew 4:18-19"),
    mc("loj-mc-b-8", "Sermon on the?", ["Mount", "Plain", "Sea", "Temple"], 0, "Jesus gave the Sermon on the Mount.", "Matthew 5:1"),
    mc("loj-mc-b-9", "Jesus calmed?", ["Storm", "Crowd", "Demons", "Animals"], 0, "Jesus calmed a storm on the sea.", "Mark 4:39"),
    mc("loj-mc-b-10", "Transfiguration mountain?", ["Sinai", "High mountain", "Olivet", "Zion"], 1, "Jesus was transfigured on a high mountain.", "Matthew 17:1"),
    mc("loj-mc-b-11", "Jesus entered Jerusalem on?", ["Horse", "Donkey", "Camel", "Foot"], 1, "Jesus entered on a donkey.", "Matthew 21:7"),
    mc("loj-mc-b-12", "Last Supper celebrated what?", ["Pentecost", "Passover", "Tabernacles", "Purim"], 1, "The Last Supper was a Passover meal.", "Luke 22:15"),
    mc("loj-mc-b-13", "Jesus prayed in?", ["Temple", "Synagogue", "Gethsemane", "Upper room"], 2, "Jesus prayed in Gethsemane.", "Matthew 26:36"),
    mc("loj-mc-b-14", "Peter denied Jesus how many times?", ["1", "2", "3", "7"], 2, "Peter denied Jesus three times.", "Luke 22:61"),
    mc("loj-mc-b-15", "Jesus carried?", ["Cross", "Sword", "Staff", "Crown"], 0, "Jesus carried His cross.", "John 19:17"),
    mc("loj-mc-b-16", "Jesus crucified at?", ["Bethany", "Calvary", "Bethlehem", "Nazareth"], 1, "Jesus was crucified at Calvary (Golgotha).", "Matthew 27:33"),
    mc("loj-mc-b-17", "Jesus side pierced with?", ["Sword", "Arrow", "Spear", "Knife"], 2, "A soldier pierced Jesus side with a spear.", "John 19:34"),
    mc("loj-mc-b-18", "Jesus buried by?", ["Disciples", "Pharisees", "Joseph of Arimathea", "Pilate"], 2, "Joseph of Arimathea buried Jesus.", "Matthew 27:57-60"),
    mc("loj-mc-b-19", "Empty tomb discovered by?", ["Peter", "John", "Women", "Angels"], 2, "Women discovered the empty tomb.", "Luke 24:1-3"),
    mc("loj-mc-b-20", "Jesus appeared to disciples how many days?", ["3", "7", "40", "50"], 2, "Jesus appeared for 40 days after resurrection.", "Acts 1:3"),
    mc("loj-mc-b-21", "Jesus ascended from?", ["Jerusalem", "Bethlehem", "Mount of Olives", "Galilee"], 2, "Jesus ascended from Mount of Olives.", "Acts 1:12"),
    mc("loj-mc-b-22", "Jesus promised to send?", ["Angels", "Holy Spirit", "Prophets", "More disciples"], 1, "Jesus promised the Holy Spirit.", "John 14:26"),
    mc("loj-mc-b-23", "Jesus performed first miracle at?", ["Jerusalem", "Cana", "Capernaum", "Bethany"], 1, "First miracle was at Cana.", "John 2:1"),
    mc("loj-mc-b-24", "Jesus healed on?", ["Monday", "Friday", "Sabbath", "Sunday"], 2, "Jesus often healed on the Sabbath.", "Luke 13:14"),
    mc("loj-mc-b-25", "Jesus taught using?", ["Parables", "Songs", "Poetry", "Letters"], 0, "Jesus taught using parables.", "Matthew 13:3"),
    mc("loj-mc-b-26", "Jesus chose how many disciples?", ["7", "12", "24", "70"], 1, "Jesus chose 12 disciples.", "Mark 3:14"),
    mc("loj-mc-b-27", "Jesus was carpenter from?", ["Bethlehem", "Jerusalem", "Nazareth", "Capernaum"], 2, "Jesus was a carpenter from Nazareth.", "Mark 6:3"),
    mc("loj-mc-b-28", "Jesus cleared temple of?", ["Pharisees", "Romans", "Money changers", "Sick people"], 2, "Jesus drove out money changers.", "Matthew 21:12"),
    mc("loj-mc-b-29", "Woman touched Jesus?", ["Robe", "Hand", "Garment hem", "Feet"], 2, "The woman touched the hem of His garment.", "Matthew 9:20"),
    mc("loj-mc-b-30", "Jesus wept over?", ["Jerusalem", "Lazarus", "Disciples", "Temple"], 1, "Jesus wept when Lazarus died.", "John 11:35"),
    mc("loj-mc-b-31", "Jesus said I am the?", ["King", "Prophet", "Way truth life", "Messiah"], 2, "Jesus said I am the way, truth, and life.", "John 14:6"),
    mc("loj-mc-b-32", "Jesus called himself?", ["Good shepherd", "Great teacher", "Wise prophet", "Holy king"], 0, "Jesus called Himself the good shepherd.", "John 10:11"),
    mc("loj-mc-b-33", "Jesus raised widow's son in?", ["Cana", "Nain", "Capernaum", "Bethany"], 1, "Jesus raised the widow's son in Nain.", "Luke 7:11-15"),
    mc("loj-mc-b-34", "Jesus healed how many lepers?", ["1", "5", "10", "100"], 2, "Jesus healed ten lepers at once.", "Luke 17:12"),
    mc("loj-mc-b-35", "How many returned to thank?", ["1", "5", "10", "None"], 0, "Only one leper returned to thank Jesus.", "Luke 17:15-16"),
])

data["life-of-jesus"]["true-false"]["beginner"].extend([
    tf("loj-tf-b-1", "Jesus was born in Nazareth.", False, "False! Jesus was born in Bethlehem.", "Matthew 2:1"),
    tf("loj-tf-b-2", "Mary was Jesus mother.", True, "True! Mary gave birth to Jesus.", "Luke 2:7"),
    tf("loj-tf-b-3", "Jesus had brothers and sisters.", True, "True! Jesus had siblings.", "Mark 6:3"),
    tf("loj-tf-b-4", "Jesus was baptized by John.", True, "True! John the Baptist baptized Jesus.", "Matthew 3:13"),
    tf("loj-tf-b-5", "Jesus chose 10 disciples.", False, "False! Jesus chose 12 disciples.", "Mark 3:14"),
    tf("loj-tf-b-6", "Jesus never got angry.", False, "False! Jesus showed righteous anger in the temple.", "Matthew 21:12"),
    tf("loj-tf-b-7", "Jesus walked on water.", True, "True! Jesus walked on the Sea of Galilee.", "Matthew 14:25"),
    tf("loj-tf-b-8", "Jesus was sinless.", True, "True! Jesus never sinned.", "Hebrews 4:15"),
    tf("loj-tf-b-9", "Jesus died by stoning.", False, "False! Jesus was crucified.", "Matthew 27:35"),
    tf("loj-tf-b-10", "Jesus rose on third day.", True, "True! Jesus rose on the third day.", "1 Corinthians 15:4"),
    tf("loj-tf-b-11", "Jesus ascended to heaven.", True, "True! Jesus ascended to heaven.", "Acts 1:9"),
    tf("loj-tf-b-12", "Jesus taught in parables.", True, "True! Jesus used many parables.", "Matthew 13:3"),
])

# ADD MIRACLES CATEGORY - 50 QUESTIONS
print("Adding Miracles questions...")
# Ensure true-false section exists
if "true-false" not in data["miracles"]:
    data["miracles"]["true-false"] = {"beginner": []}

data["miracles"]["multiple-choice"]["beginner"].extend([
    mc("mir-mc-b-3", "Feeding 5000 miracle used?", ["3 loaves", "5 loaves 2 fish", "7 loaves", "12 baskets"], 1, "Jesus used 5 loaves and 2 fish.", "Matthew 14:17"),
    mc("mir-mc-b-4", "Baskets left over from 5000?", ["5", "7", "12", "20"], 2, "12 baskets were left over.", "Matthew 14:20"),
    mc("mir-mc-b-5", "Jesus walked on?", ["Jordan", "Red Sea", "Sea of Galilee", "Dead Sea"], 2, "Jesus walked on the Sea of Galilee.", "Matthew 14:25"),
    mc("mir-mc-b-6", "Peter walked on water toward?", ["John", "Andrew", "Jesus", "Angel"], 2, "Peter walked toward Jesus.", "Matthew 14:29"),
    mc("mir-mc-b-7", "Jesus calmed storm with?", ["Touch", "Prayer", "Word", "Staff"], 2, "Jesus spoke to calm the storm.", "Mark 4:39"),
    mc("mir-mc-b-8", "Blind man healed with?", ["Touch", "Mud and spit", "Prayer", "Oil"], 1, "Jesus used mud and spit.", "John 9:6"),
    mc("mir-mc-b-9", "Lazarus was dead for?", ["1 day", "2 days", "4 days", "7 days"], 2, "Lazarus was dead 4 days.", "John 11:17"),
    mc("mir-mc-b-10", "Jesus raised Lazarus with?", ["Touch", "Command", "Prayer", "Song"], 1, "Jesus commanded Lazarus to come out.", "John 11:43"),
    mc("mir-mc-b-11", "Woman healed by touching?", ["Jesus hand", "Jesus robe", "Jesus hem", "Jesus feet"], 2, "She touched the hem of His garment.", "Matthew 9:20"),
    mc("mir-mc-b-12", "How long bleeding?", ["5 years", "10 years", "12 years", "20 years"], 2, "She had been bleeding for 12 years.", "Mark 5:25"),
    mc("mir-mc-b-13", "Jairus' daughter was?", ["Sick", "Blind", "Dead", "Lame"], 2, "Jairus' daughter had died.", "Mark 5:35"),
    mc("mir-mc-b-14", "Jesus said she was?", ["Dead", "Sleeping", "Sick", "Resting"], 1, "Jesus said she was sleeping.", "Mark 5:39"),
    mc("mir-mc-b-15", "Wedding miracle location?", ["Jerusalem", "Cana", "Capernaum", "Bethany"], 1, "The wedding was in Cana.", "John 2:1"),
    mc("mir-mc-b-16", "Water became?", ["Milk", "Wine", "Oil", "Honey"], 1, "Water became wine.", "John 2:9"),
    mc("mir-mc-b-17", "Lepers healed were?", ["5", "7", "10", "12"], 2, "Ten lepers were healed.", "Luke 17:12"),
    mc("mir-mc-b-18", "How many returned?", ["None", "1", "5", "10"], 1, "Only one returned to thank Jesus.", "Luke 17:15"),
    mc("mir-mc-b-19", "Man lowered through?", ["Window", "Roof", "Door", "Wall"], 1, "Friends lowered him through the roof.", "Mark 2:4"),
    mc("mir-mc-b-20", "Jesus told him to?", ["Walk", "Stand", "Rise and walk", "Be healed"], 2, "Jesus said Rise, take up your bed and walk.", "Mark 2:11"),
    mc("mir-mc-b-21", "Withered hand healed on?", ["Monday", "Friday", "Sabbath", "Passover"], 2, "Jesus healed on the Sabbath.", "Luke 6:6"),
    mc("mir-mc-b-22", "Woman bent over for?", ["5 years", "10 years", "18 years", "30 years"], 2, "She was bent for 18 years.", "Luke 13:11"),
    mc("mir-mc-b-23", "Jesus healed servant of?", ["Pharisee", "Centurion", "Tax collector", "Priest"], 1, "The centurion's servant was healed.", "Matthew 8:5"),
    mc("mir-mc-b-24", "Centurion showed great?", ["Wealth", "Power", "Faith", "Wisdom"], 2, "The centurion showed great faith.", "Matthew 8:10"),
    mc("mir-mc-b-25", "Fig tree cursed for?", ["Dead branches", "No fruit", "Wrong place", "Too tall"], 1, "The tree had no fruit.", "Mark 11:13"),
    mc("mir-mc-b-26", "Fig tree did what?", ["Bloomed", "Withered", "Fell", "Grew"], 1, "The fig tree withered.", "Mark 11:20"),
    mc("mir-mc-b-27", "Coin found in?", ["Purse", "Road", "Fish mouth", "Temple"], 2, "A coin was found in a fish's mouth.", "Matthew 17:27"),
    mc("mir-mc-b-28", "Widow's son raised in?", ["Cana", "Nain", "Bethany", "Jerusalem"], 1, "The widow's son was in Nain.", "Luke 7:11"),
    mc("mir-mc-b-29", "Deaf and mute man?", ["Bethsaida", "Decapolis", "Galilee", "Judea"], 1, "This miracle was in Decapolis.", "Mark 7:31"),
    mc("mir-mc-b-30", "Blind Bartimaeus was in?", ["Jerusalem", "Jericho", "Bethany", "Capernaum"], 1, "Bartimaeus was healed in Jericho.", "Mark 10:46"),
    mc("mir-mc-b-31", "Man at pool waited?", ["10 years", "20 years", "38 years", "50 years"], 2, "He waited 38 years.", "John 5:5"),
    mc("mir-mc-b-32", "Pool name was?", ["Siloam", "Bethesda", "Jordan", "Galilee"], 1, "The Pool of Bethesda.", "John 5:2"),
    mc("mir-mc-b-33", "Large catch of fish when?", ["Morning", "Noon", "Night", "After fishing all night"], 3, "After fishing unsuccessfully all night.", "Luke 5:5"),
])

data["miracles"]["true-false"]["beginner"].extend([
    tf("mir-tf-b-1", "Jesus first miracle was healing.", False, "False! First miracle was water to wine.", "John 2:11"),
    tf("mir-tf-b-2", "Jesus raised three people from dead.", True, "True! Jairus' daughter, widow's son, and Lazarus.", "Various"),
    tf("mir-tf-b-3", "Jesus fed 5000 people.", True, "True! Jesus miraculously fed 5000.", "Matthew 14:21"),
    tf("mir-tf-b-4", "Jesus walked on water in daytime.", False, "False! It was during the night.", "Matthew 14:25"),
    tf("mir-tf-b-5", "Peter tried to walk on water.", True, "True! Peter walked on water toward Jesus.", "Matthew 14:29"),
    tf("mir-tf-b-6", "Jesus healed a blind man.", True, "True! Jesus healed many blind people.", "John 9:6"),
    tf("mir-tf-b-7", "Jesus used medicine to heal.", False, "False! Jesus healed by His power and word.", "Various"),
    tf("mir-tf-b-8", "Jesus healed lepers.", True, "True! Jesus cleansed lepers.", "Luke 17:14"),
    tf("mir-tf-b-9", "All ten lepers thanked Jesus.", False, "False! Only one returned to thank Him.", "Luke 17:15"),
    tf("mir-tf-b-10", "Jesus calmed a storm.", True, "True! Jesus calmed a storm on the sea.", "Mark 4:39"),
    tf("mir-tf-b-11", "Jesus could not heal in Nazareth.", True, "True! Because of their unbelief.", "Mark 6:5"),
    tf("mir-tf-b-12", "Jesus raised Lazarus after 4 days.", True, "True! Lazarus had been dead 4 days.", "John 11:39"),
    tf("mir-tf-b-13", "Woman with bleeding touched Jesus.", True, "True! She touched His garment hem.", "Mark 5:27"),
    tf("mir-tf-b-14", "Jesus healed only Jews.", False, "False! Jesus healed Gentiles too.", "Matthew 15:28"),
    tf("mir-tf-b-15", "Jesus turned water to wine.", True, "True! At a wedding in Cana.", "John 2:9"),
])

# ADD PARABLES CATEGORY - 50 NEW QUESTIONS
print("Adding Parables questions...")
data["parables"] = {
    "multiple-choice": {
        "beginner": [
            mc("par-mc-b-1", "Good Samaritan helped?", ["Priest", "Levite", "Injured man", "Innkeeper"], 2, "The Samaritan helped an injured man.", "Luke 10:33"),
            mc("par-mc-b-2", "Prodigal son wasted money on?", ["Business", "Wild living", "Travel", "House"], 1, "He wasted it on wild living.", "Luke 15:13"),
            mc("par-mc-b-3", "Prodigal son fed?", ["Sheep", "Cattle", "Pigs", "Chickens"], 2, "He fed pigs.", "Luke 15:15"),
            mc("par-mc-b-4", "Father gave prodigal son?", ["Robe ring sandals", "Money", "House", "Servants"], 0, "Father gave robe, ring, and sandals.", "Luke 15:22"),
            mc("par-mc-b-5", "Sower's seed fell on?", ["Good soil only", "4 types ground", "3 types ground", "Rocky ground only"], 1, "Seed fell on 4 types of ground.", "Matthew 13:4-8"),
            mc("par-mc-b-6", "Good soil represents?", ["Rich people", "Smart people", "Hearing and accepting", "Religious people"], 2, "Those who hear and accept God's word.", "Matthew 13:23"),
            mc("par-mc-b-7", "Mustard seed is?", ["Very large", "Very small", "Medium", "Colorful"], 1, "The mustard seed is very small.", "Matthew 13:31-32"),
            mc("par-mc-b-8", "Mustard seed grows into?", ["Flower", "Large tree", "Bush", "Vine"], 1, "It grows into a large tree.", "Matthew 13:32"),
            mc("par-mc-b-9", "Lost sheep out of?", ["50", "75", "100", "1000"], 2, "One sheep out of 100 was lost.", "Luke 15:4"),
            mc("par-mc-b-10", "Shepherd left how many?", ["99", "50", "75", "None"], 0, "Shepherd left the 99 to find one.", "Luke 15:4"),
            mc("par-mc-b-11", "Woman lost how many coins?", ["1", "5", "10", "20"], 0, "She lost one coin.", "Luke 15:8"),
            mc("par-mc-b-12", "Woman had total coins?", ["5", "10", "20", "100"], 1, "She had 10 silver coins total.", "Luke 15:8"),
            mc("par-mc-b-13", "Wise man built house on?", ["Sand", "Rock", "Wood", "Hill"], 1, "The wise man built on rock.", "Matthew 7:24"),
            mc("par-mc-b-14", "Foolish man built on?", ["Rock", "Sand", "Grass", "Clay"], 1, "The foolish man built on sand.", "Matthew 7:26"),
            mc("par-mc-b-15", "Ten virgins had?", ["Lamps", "Candles", "Torches", "Lanterns"], 0, "They had lamps.", "Matthew 25:1"),
            mc("par-mc-b-16", "How many virgins wise?", ["3", "5", "7", "10"], 1, "Five virgins were wise.", "Matthew 25:2"),
            mc("par-mc-b-17", "Wise virgins brought?", ["Water", "Food", "Extra oil", "Matches"], 2, "They brought extra oil.", "Matthew 25:4"),
            mc("par-mc-b-18", "Pharisee and tax collector prayed where?", ["Synagogue", "Temple", "Home", "Mountain"], 1, "They prayed in the temple.", "Luke 18:10"),
            mc("par-mc-b-19", "Tax collector asked for?", ["Honor", "Mercy", "Money", "Power"], 1, "He asked God for mercy.", "Luke 18:13"),
            mc("par-mc-b-20", "Persistent widow wanted?", ["Money", "Justice", "Food", "House"], 1, "She wanted justice.", "Luke 18:3"),
            mc("par-mc-b-21", "Two debtors owed?", ["Same amount", "Different amounts", "Nothing", "Everything"], 1, "They owed different amounts.", "Luke 7:41"),
            mc("par-mc-b-22", "Creditor did what?", ["Demanded payment", "Forgave both", "Put in prison", "Took property"], 1, "He forgave both debts.", "Luke 7:42"),
            mc("par-mc-b-23", "Rich man had?", ["Purple fine linen", "Silk robes", "Gold jewelry", "Large house"], 0, "He wore purple and fine linen.", "Luke 16:19"),
            mc("par-mc-b-24", "Lazarus was?", ["Rich", "Poor beggar", "Servant", "Priest"], 1, "Lazarus was a poor beggar.", "Luke 16:20"),
            mc("par-mc-b-25", "Hidden treasure found in?", ["Cave", "Field", "House", "Mountain"], 1, "Treasure was hidden in a field.", "Matthew 13:44"),
            mc("par-mc-b-26", "Man sold all to buy?", ["House", "Treasure", "Field", "Both B and C"], 3, "He sold all to buy the field with treasure.", "Matthew 13:44"),
            mc("par-mc-b-27", "Pearl merchant found?", ["Many pearls", "One great pearl", "No pearls", "Fake pearls"], 1, "He found one pearl of great price.", "Matthew 13:46"),
            mc("par-mc-b-28", "Talents given to servants?", ["1 each", "5 each", "Different amounts", "10 each"], 2, "Different amounts were given.", "Matthew 25:15"),
            mc("par-mc-b-29", "Servant with one talent?", ["Invested", "Buried it", "Spent it", "Lost it"], 1, "He buried the talent.", "Matthew 25:18"),
            mc("par-mc-b-30", "Workers hired at?", ["Noon only", "Morning only", "Different times", "Night"], 2, "Workers hired at different times.", "Matthew 20:1-16"),
            mc("par-mc-b-31", "All workers got?", ["Different pay", "Same pay", "No pay", "Half pay"], 1, "All received the same wage.", "Matthew 20:10"),
            mc("par-mc-b-32", "Wedding feast for?", ["King's son", "King's daughter", "Prince", "Princess"], 0, "Feast for the king's son.", "Matthew 22:2"),
            mc("par-mc-b-33", "Invited guests did what?", ["Came eagerly", "Made excuses", "Brought gifts", "Sent others"], 1, "They made excuses.", "Matthew 22:3-5"),
            mc("par-mc-b-34", "Man without wedding garment?", ["Welcomed", "Honored", "Thrown out", "Given robe"], 2, "He was thrown out.", "Matthew 22:13"),
            mc("par-mc-b-35", "Friend at midnight needed?", ["Money", "Bread", "Water", "Shelter"], 1, "He needed bread.", "Luke 11:5"),
        ]
    },
    "true-false": {
        "beginner": [
            tf("par-tf-b-1", "Good Samaritan parable teaches love.", True, "True! It teaches us to love our neighbor.", "Luke 10:27"),
            tf("par-tf-b-2", "Prodigal son had two brothers.", False, "False! He had one brother.", "Luke 15:11"),
            tf("par-tf-b-3", "Father welcomed prodigal son back.", True, "True! The father welcomed him with joy.", "Luke 15:20"),
            tf("par-tf-b-4", "Older brother was happy.", False, "False! The older brother was angry.", "Luke 15:28"),
            tf("par-tf-b-5", "Sower parable about God's word.", True, "True! It's about receiving God's word.", "Matthew 13:19"),
            tf("par-tf-b-6", "All soil produced crops.", False, "False! Only good soil produced crops.", "Matthew 13:23"),
            tf("par-tf-b-7", "Shepherd left 99 for 1 sheep.", True, "True! He went after the one lost sheep.", "Luke 15:4"),
            tf("par-tf-b-8", "Woman had 100 coins.", False, "False! She had 10 coins.", "Luke 15:8"),
            tf("par-tf-b-9", "Wise builder built on rock.", True, "True! The wise builder chose rock.", "Matthew 7:24"),
            tf("par-tf-b-10", "Foolish builder's house stood.", False, "False! It fell when storms came.", "Matthew 7:27"),
            tf("par-tf-b-11", "All ten virgins were wise.", False, "False! Only five were wise.", "Matthew 25:2"),
            tf("par-tf-b-12", "Wise virgins shared oil.", False, "False! They couldn't share their oil.", "Matthew 25:9"),
            tf("par-tf-b-13", "Tax collector was humble.", True, "True! He humbly asked for mercy.", "Luke 18:13"),
            tf("par-tf-b-14", "Pharisee thanked God.", True, "True! But he was proud and self-righteous.", "Luke 18:11"),
            tf("par-tf-b-15", "Hidden treasure represents kingdom.", True, "True! It represents God's kingdom.", "Matthew 13:44"),
        ]
    }
}

# ADD WOMEN OF BIBLE CATEGORY - 50 NEW QUESTIONS
print("Adding Women of Bible questions...")
data["women-of-bible"] = {
    "multiple-choice": {
        "beginner": [
            mc("wob-mc-b-1", "First woman created?", ["Sarah", "Eve", "Mary", "Ruth"], 1, "Eve was the first woman.", "Genesis 2:22"),
            mc("wob-mc-b-2", "Abraham's wife?", ["Rachel", "Sarah", "Rebekah", "Leah"], 1, "Sarah was Abraham's wife.", "Genesis 17:15"),
            mc("wob-mc-b-3", "Isaac's wife?", ["Rachel", "Sarah", "Rebekah", "Leah"], 2, "Rebekah was Isaac's wife.", "Genesis 24:67"),
            mc("wob-mc-b-4", "Jacob's wives?", ["Rachel and Leah", "Sarah and Rebekah", "Ruth and Naomi", "Mary and Martha"], 0, "Jacob married Rachel and Leah.", "Genesis 29:23-28"),
            mc("wob-mc-b-5", "Moses' mother?", ["Jochebed", "Miriam", "Zipporah", "Sarah"], 0, "Jochebed was Moses' mother.", "Exodus 6:20"),
            mc("wob-mc-b-6", "Moses' sister?", ["Miriam", "Deborah", "Hannah", "Ruth"], 0, "Miriam was Moses' sister.", "Exodus 15:20"),
            mc("wob-mc-b-7", "Who was prophetess and judge?", ["Ruth", "Deborah", "Esther", "Hannah"], 1, "Deborah was a prophetess and judge.", "Judges 4:4"),
            mc("wob-mc-b-8", "Ruth was from?", ["Israel", "Egypt", "Moab", "Canaan"], 2, "Ruth was from Moab.", "Ruth 1:4"),
            mc("wob-mc-b-9", "Ruth's mother-in-law?", ["Rachel", "Sarah", "Naomi", "Rebekah"], 2, "Naomi was Ruth's mother-in-law.", "Ruth 1:4"),
            mc("wob-mc-b-10", "Ruth married?", ["David", "Boaz", "Judah", "Jesse"], 1, "Ruth married Boaz.", "Ruth 4:13"),
            mc("wob-mc-b-11", "Hannah prayed for?", ["Husband", "Son", "Money", "House"], 1, "Hannah prayed for a son.", "1 Samuel 1:11"),
            mc("wob-mc-b-12", "Hannah's son?", ["David", "Solomon", "Samuel", "Saul"], 2, "Hannah gave birth to Samuel.", "1 Samuel 1:20"),
            mc("wob-mc-b-13", "Queen who saved Jews?", ["Ruth", "Esther", "Deborah", "Sarah"], 1, "Esther saved the Jewish people.", "Esther 7:3"),
            mc("wob-mc-b-14", "Esther's cousin?", ["Boaz", "Mordecai", "Haman", "Xerxes"], 1, "Mordecai was Esther's cousin.", "Esther 2:7"),
            mc("wob-mc-b-15", "Mary was from?", ["Bethlehem", "Jerusalem", "Nazareth", "Capernaum"], 2, "Mary was from Nazareth.", "Luke 1:26"),
            mc("wob-mc-b-16", "Angel told Mary?", ["Gabriel", "Michael", "Raphael", "Uriel"], 0, "Gabriel appeared to Mary.", "Luke 1:26"),
            mc("wob-mc-b-17", "Mary visited?", ["Anna", "Elizabeth", "Ruth", "Sarah"], 1, "Mary visited Elizabeth.", "Luke 1:39"),
            mc("wob-mc-b-18", "Elizabeth's son?", ["Jesus", "John the Baptist", "James", "Peter"], 1, "Elizabeth gave birth to John the Baptist.", "Luke 1:57"),
            mc("wob-mc-b-19", "Woman at well from?", ["Judea", "Galilee", "Samaria", "Bethlehem"], 2, "The woman was from Samaria.", "John 4:7"),
            mc("wob-mc-b-20", "Mary and Martha's brother?", ["Peter", "John", "Lazarus", "Andrew"], 2, "Lazarus was their brother.", "John 11:1"),
            mc("wob-mc-b-21", "Mary Magdalene saw?", ["Angels", "Risen Jesus", "Empty tomb", "All above"], 3, "Mary saw angels, empty tomb, and Jesus.", "John 20:11-18"),
            mc("wob-mc-b-22", "Priscilla with husband?", ["Paul", "Aquila", "Apollos", "Timothy"], 1, "Priscilla's husband was Aquila.", "Acts 18:2"),
            mc("wob-mc-b-23", "Lydia sold?", ["Food", "Purple cloth", "Pottery", "Jewelry"], 1, "Lydia sold purple cloth.", "Acts 16:14"),
            mc("wob-mc-b-24", "Dorcas was known for?", ["Preaching", "Good works", "Singing", "Teaching"], 1, "Dorcas was known for good works.", "Acts 9:36"),
            mc("wob-mc-b-25", "Peter raised who?", ["Mary", "Dorcas", "Lydia", "Priscilla"], 1, "Peter raised Dorcas from death.", "Acts 9:40"),
            mc("wob-mc-b-26", "Rahab helped?", ["Moses", "Joshua", "Israelite spies", "David"], 2, "Rahab helped Israelite spies.", "Joshua 2:4"),
            mc("wob-mc-b-27", "Rahab's sign was?", ["White cloth", "Red cord", "Blue ribbon", "Yellow rope"], 1, "Rahab hung a red cord.", "Joshua 2:18"),
            mc("wob-mc-b-28", "Jezebel married?", ["David", "Ahab", "Solomon", "Saul"], 1, "Jezebel married King Ahab.", "1 Kings 16:31"),
            mc("wob-mc-b-29", "Jezebel opposed?", ["Moses", "David", "Elijah", "Daniel"], 2, "Jezebel opposed the prophet Elijah.", "1 Kings 19:1-2"),
            mc("wob-mc-b-30", "Bathsheba's husband?", ["David", "Uriah", "Solomon", "Nathan"], 1, "Bathsheba was married to Uriah.", "2 Samuel 11:3"),
            mc("wob-mc-b-31", "Anna was a?", ["Queen", "Prophetess", "Servant", "Teacher"], 1, "Anna was a prophetess.", "Luke 2:36"),
            mc("wob-mc-b-32", "Anna saw baby?", ["John", "Jesus", "James", "Peter"], 1, "Anna saw baby Jesus in temple.", "Luke 2:38"),
            mc("wob-mc-b-33", "Sapphira lied about?", ["Money", "Food", "Property", "Identity"], 0, "Sapphira lied about the money.", "Acts 5:2"),
            mc("wob-mc-b-34", "Woman with alabaster jar?", ["Anointed Jesus", "Washed feet", "Gave money", "Cooked meal"], 0, "She anointed Jesus with perfume.", "Mark 14:3"),
            mc("wob-mc-b-35", "Widow gave?", ["Gold", "Two coins", "Bread", "Sheep"], 1, "The widow gave two small coins.", "Mark 12:42"),
        ]
    },
    "true-false": {
        "beginner": [
            tf("wob-tf-b-1", "Eve was first woman.", True, "True! Eve was created from Adam's rib.", "Genesis 2:22"),
            tf("wob-tf-b-2", "Sarah had Isaac in youth.", False, "False! Sarah had Isaac in old age.", "Genesis 21:2"),
            tf("wob-tf-b-3", "Rachel was Jacob's favorite wife.", True, "True! Jacob loved Rachel.", "Genesis 29:30"),
            tf("wob-tf-b-4", "Miriam was a prophetess.", True, "True! Miriam was Moses' sister and a prophetess.", "Exodus 15:20"),
            tf("wob-tf-b-5", "Deborah was a judge.", True, "True! Deborah judged Israel.", "Judges 4:4"),
            tf("wob-tf-b-6", "Ruth abandoned Naomi.", False, "False! Ruth stayed with Naomi.", "Ruth 1:16"),
            tf("wob-tf-b-7", "Esther was a queen.", True, "True! Esther became Queen of Persia.", "Esther 2:17"),
            tf("wob-tf-b-8", "Mary was Jesus mother.", True, "True! Mary gave birth to Jesus.", "Luke 2:7"),
            tf("wob-tf-b-9", "Elizabeth was barren.", True, "True! Elizabeth was barren until old age.", "Luke 1:7"),
            tf("wob-tf-b-10", "Martha was Mary's sister.", True, "True! Martha and Mary were sisters.", "Luke 10:38-39"),
            tf("wob-tf-b-11", "Mary Magdalene was demon-possessed.", True, "True! Jesus cast out seven demons from her.", "Luke 8:2"),
            tf("wob-tf-b-12", "Priscilla taught Apollos.", True, "True! Priscilla and Aquila taught Apollos.", "Acts 18:26"),
            tf("wob-tf-b-13", "Lydia sold food.", False, "False! Lydia sold purple cloth.", "Acts 16:14"),
            tf("wob-tf-b-14", "Dorcas made clothing.", True, "True! Dorcas made clothes for the poor.", "Acts 9:39"),
            tf("wob-tf-b-15", "Rahab was a prostitute.", True, "True! Rahab was a prostitute who helped spies.", "Joshua 2:1"),
        ]
    }
}

# Save updated questions
print("\n💾 Saving comprehensive questions file...")
with open('questions.json', 'w') as f:
    json.dump(data, f, indent=2)

print("\n✅ COMPLETE!")
print("\n📊 Final question counts:")
for cat, qs in data.items():
    total = sum(len(q) for qt in qs.values() for q in qt.values())
    print(f"  {cat}: {total} questions")

print("\n🎉 All categories now have substantial content!")
print("Users can now pull-to-refresh to get all these questions!")

