# Remix Keep It Super Simple (KISS) Routes

> [!WARNING]
> This package is in active development, API changes are no longer expected.
> We're getting close to 1.0.0, we now have this in production on a few sites.

The goal of this package is to provide a simple way to define routes in Remix using a structured file system.
The routing method in Remix is _OK_, but has many nuances and arbitrary rules that make it difficult to onboard new developers, leaves file/folder names littered with `_`,`[`,`+` amongst other special characters with little meaning unless you know the rules and odd nuances.

## 🤷‍♂️ Why?
Frustration with a flat folder routing system, a project with 1000's of routes is not fun to open in VSCode, the sidebar becomes unmanageably long, scrolling up and down becomes tedious very quickly.

We want to be able to define our routes in a way that makes intuitive sense, maps to the web in a logical predictable way, and is easy to keep well organized across teams.

## 💡 Concepts

- Routes are defined and nested using folders, very similar to how you'd layout HTML files on an nginx server.
- `_layout` files wrap all routes downstream, these need an `<Outlet />` to render the child routes.
- `_index` files are the default file for a folder, eg: `/users/_index.tsx` would become `/users`.
- Variables are denoted using `$` in the file path, eg: `/users/$id/edit.tsx` would become `/users/123/edit`
- You can replace folders with a "virtual" folder using a `.` in the filename, eg: `/users.$id.edit.tsx` would become `/users/123/edit`.
- You can escape special characters in the file path using `[]`, eg: `/make-[$$$]-fast-online.tsx` would become `/make-$$$-fast-online`
- Files and folders prefixed with an `_` become invisible, allowing for folder organization without affecting the route path eg: `/_legal-pages/privacy-policy.tsx` would become `/privacy-policy`
- Files not ending in `.jsx`, `.tsx`, `.js`, `.ts` are ignored, allowing you to keep assets and other files in the same folder as your routes.

## 🔮 Example

### 📂 File System
```
├── _index.jsx
├── _layout.jsx
├── users
│   ├── _index.jsx
│   ├── _layout.jsx
│   ├── $id
│   │   ├── _index.jsx
│   │   ├── _layout.jsx
│   │   └── edit.jsx
|   └── $id.view.jsx
└── _legal-pages
    └── privacy-policy.jsx
```

### 🧬 Routes Generated
```
/_index.jsx -> /
/users/_index.jsx -> /users
/users/$id/_index.jsx -> /users/$id
/users/$id/edit.jsx -> /users/$id/edit
/users/$id.view.jsx -> /users/$id/view
/_legal-pages/privacy-policy.jsx -> /privacy-policy
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
    pathlessCharacter: '_', // the character to make a file or folder pathless (invisible)
    delimiterCharacter: '.', // used for virtual folders, internally replaced with '/'
    layoutFileName: '_layout',  // the name of the layout file
    indexFileName: '_index', // the name of the index file
}
```
