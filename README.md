# hoopbet - p2p microbetting
<img src="src/assets/HOOP-logo.png" width="100px">

###### modern microbetting - reimagined

made for [madhacks](https://madhacks.io)

Small scale micro betting re imagined for the 21st century. Create wagers on games, events, and so much more for your friends, than bet on them. Small scale, and built on trust. 

## features
- user registration and creation
- market creation and resolution
- profile view with bet tracking
- distribution of virtual currency for betting

## how we built hoopbet
hoopbet's frontend is built with [react](https://react.dev/) + [vite](https://vite.dev/) to allow for reusable components and ease of access to backend servers. this also allowed hot-reloading for development and the implementation of further abstranctions for simplified development process. styling is done for the most part in [tailwind](https://tailwindcss.com/) which gives us the sweet spot between the over-abstraction of bootstrap and the controllability of (S)CSS.

hoopbet's backend is an [express](https://expressjs.com/) server which serves json files to store user data, which enables a smooth integration with javascript that does not rely on more external frameworks. 

## challenges we ran into

There were numerous issues we encountered early in the devlopment process, namely deciding which frameworks would be the best to make this project in. We spent a long time dithering over minutae, which in the end, did not matter as much as the core functionality of this project. We spent a long time looking at the trees instead of the forest. Another issue we faced was vscode's live share feature being too slow for the development process, so we had to delegate tasks for each other and communicate well to avoid merge conflicts. 

another large issue we faced was that our original project idea. we had planned to integrate stripe, but our project is against the stripe TOS which meant this would not work. 

## features in planning
- invitation-locked markets
- better ui for resolution
- leaderboards
- betting groups