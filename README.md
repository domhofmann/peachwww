# peachwww

This is the source code for [peachwww.com](http://peachwww.com), an unofficial web client for Peach.

## Purpose

One of our goals for Peach is to be a great for developers. I'd like to make sure we do that by building on it myself.

**This project will only ever use APIs and methods that 3rd party developers have access to.** This makes us more sensitive to developers on Peach.

I'd like to ensure my needs align with the needs of Peach developers, which will help us to respond to them quickly and appropriately.

🍑

---

This project may be forked as the basis for an official client in the future, but right now we don't have the bandwidth to build or support one. So it's a personal project for now.

## Status

Very early. Can't make too many promises about the quality of the code, but I'm trying!

## Features

- **Mostly read-only** right now. Account creation is not supported, and post types are about halfway there.

- Automatically refreshes, so it's nice to leave open in a tab somewhere

- Chat-ish interface

- Use the L/R arrow keys to navigate through people

### Other notes

- We don't currently support 3rd party image uploading through our API, so **all images posted through peachwww are uploaded to Imgur.** Peach will open this soon, and then I'll make the change here, but for now: upload at your own risk!

### Installation

```
$ npm install
```

Then create a `.env` file in the project directory and set these variables:

```
IMGUR_CLIENT_ID=XXX
EMBEDLY_API_KEY=XXX
```

Or if your environment has another way of setting `process.env`, do that. ⚡️

Or if you don't need to support post creation, don't do anything. 😋

Then:

```
$ npm start
```

### TODO:

* Sign up
* ~~Log in~~
* ~~View streams~~
* ~~Mark viewed streams as read~~
* ~~Render all post types~~
* ~~Likes~~
* ~~Leave and view comments~~
* @mention autocompletion
* View profiles
* Edit profile
* Activity
* Add friends
* ~~Create `text` posts~~
* ~~Create `image` posts~~
* ~~Create `gif` posts~~
* Create `video` posts
* Create `location` posts
