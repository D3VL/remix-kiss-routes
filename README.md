# Remix Keep It Super Simple (KISS) Routes

> [!WARNING]
> This package is in active development, API changes are no longer expected.
> We're getting close to 1.0.0, we now have this in production on a few sites.

The goal of this package is to provide a simple way to define routes in Remix using a structured file system.
The routing method in Remix is _OK_, but has many nuances and arbitrary rules that make it difficult to onboard new developers, leaves file/folder names littered with `_`,`-`,`+` amongst other special characters with little meaning unless you know the rules and odd nuances.

## 🤷‍♂️ Why?
Frustration with a flat folder routing system, a project with 1000's of routes is not fun to open in VSCode, the sidebar becomes unmanageably long, scrolling up and down becomes tedious very quickly.

We want to be able to define our routes in a way that makes intuitive sense, maps to the web in a logical predictable way, and is easy to keep well organized across teams.

## 💡 Concepts

- Routes are defined and nested using folders, very similar to how you'd layout HTML files on an nginx server.
- `_layout.jsx`/`_layout.tsx` files affect all routes downstream, these need an `<Outlet />` to render the child routes.
- Variables are denoted using `$` in the file path, eg: `/users/$id/edit.jsx` would become `/users/123/edit`
- `index.jsx`/`index.tsx` files are the default file for a folder, eg: `/users/index.jsx` would become `/users`.
- You can replace folders with a "virtual" folder using a `.` in the filename, eg: `/users.$id.edit.jsx` would become `/users/123/edit`.
- You can escape special characters in the file path using `[]`, eg: `/make-[$$$]-fast-online.jsx` would become `/make-$$$-fast-online`
- Folders can be invisible for organization purposes, just suffix it with a `+`, eg: `/legal-pages+/privacy-policy.jsx` would become `/privacy-policy`
- Files not ending in `.jsx`, `.tsx`, `.js`, `.ts` are ignored, allowing you to keep assets and other files in the same folder as your routes.

## 🔮 Example

### 📂 File System
```
├── index.jsx
├── _layout.jsx
├── users
│   ├── index.jsx
│   ├── _layout.jsx
│   ├── $id
│   │   ├── index.jsx
│   │   ├── _layout.jsx
│   │   └── edit.jsx
|   └── $id.view.jsx
└── legal-pages+
    └── privacy-policy.jsx
```

### 🧬 Routes Generated
```
/index.jsx -> /
/users/index.jsx -> /users (TIP: you can also use user.jsx to match /user)
/users/$id/index.jsx -> /users/$id
/users/$id/edit.jsx -> /users/$id/edit
/users/$id.view.jsx -> /users/$id/view
/legal-pages+/privacy-policy.jsx -> /privacy-policy
```
✨ See how super simple that is!

## 🔨 Usage

### 🚀 Install the package:
`npm install -D remix-kiss-routes`

### 💿 Remix Config
```js
// remix.config.js
import { kissRoutes } from 'remix-kiss-routes'
// ---- OR ---- //
const { kissRoutes } = require('remix-kiss-routes')


/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
    ignoredRouteFiles: ["**/*"],
    routes: defineRoutes => {
        return kissRoutes(defineRoutes)
        // or  kissRoutes(defineRoutes, RemixKissRoutesOptions)
    },
}
```

Parameters:
```js
const RemixKissRoutesOptions = {
    app: './app', // where your root.jsx file is located
    routes: 'routes', // where your routes are located relative to app
    caseSensitive: false, // whether or not to use case sensitive routes
    variableCharacter: '$', // the character to denote a variable in the route path
    flattenCharacter: '+', // the character to denote a folder should be flattened
    delimiterCharacter: '.', // used for virtual folders, internally replaced with '/'
    layoutFileName: '_layout',  // the name of the layout file
    indexFileName: 'index', // the name of the index file
}
```
