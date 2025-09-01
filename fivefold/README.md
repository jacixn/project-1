# My Biblely App Project

Hey, so I came up with this app called Biblely to mix my daily prayers with productivity stuff in a way that feels easy and modern. It's got five prayer reminders every day, each with two fresh Bible verses, a fun gamified to-do list, and some AI to rewrite verses simply and score tasks fairly. I focused on making it all work offline, super private, and straightforward to use—no complicated setups.

The main idea is ditching fixed prayer times for ones based on the sun. It grabs my location (only if I okay it) and figures out sunrise, sunset, noon, dawn, and dusk using that NOAA formula. Then it sets five slots: one before sunrise, after sunrise, midday, before sunset, and after sunset. Notifications pop up nicely, with options to snooze or set quiet hours so it doesn't bug me at night.

For the verses, I have the whole Bible saved locally on the app. It picks two per prayer in a random order just for me, and doesn't repeat any until I've seen them all. The AI part rewrites them into easy modern English, keeping the original meaning but ditching old words— and it saves those rewrites locally so it's consistent even offline.

On the prayer side, I built in rewards to keep me going: points for each slot I complete, a bonus if I do all five in a day, and streaks that allow one skip per week without breaking the chain. It tracks how many unique verses I've read, my points, and days in a row, showing it all on the home screen with some nice visuals.

For to-dos, when I add a task, AI gives it a difficulty score from 0 to 1 based on how hard or time-consuming it is, then slots it into bands like Tiny or Epic with base points. It adds bonuses for urgency or streaks, subtracts for lateness, all to keep scoring fair and not inflated. Tries to run locally, but can use cloud if needed.

The gamification ties it all together—I earn points from prayers and tasks, unlock badges for things like doing all prayers for a week or finishing 20 tasks, and level up with easy thresholds to stay motivated without pressure. There are weekly quests and streak trackers too.

Everything's stored on my device with optional encrypted backups, no data sent to servers. It handles weird cases like missing a prayer, traveling to a new city, or no internet by falling back gracefully.

Basically, this is my way to blend faith and getting things done. It auto-schedules prayers, makes scripture easy to read, scores tasks smartly, and rewards sticking with it. Excited to build this out!

## Getting Started (Tech Stuff)

I bootstrapped this with Create React App for the web version.

### Commands I Use

In the fivefold folder:

#### `npm start`

Starts the dev server. Go to http://localhost:3000 in my browser to see it.

It reloads when I change code, and shows lint errors if any.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## What's Next

Still working on some features:
- Re-enabling the settings page (temporarily disabled while debugging)
- Better prayer time calculations for different time zones
- More Bible verses and better AI paraphrasing
- Maybe an iOS version if this web app works well

The core stuff is solid though - prayers, todos, progress tracking all work great.
