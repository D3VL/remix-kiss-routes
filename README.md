# Remix Keep It Super Simple (KISS) Routes

> ### ⚠️ WARNING
> This package is in active development and is not ready for production use yet.

The goal of this module is to provide a simple way to define routes in Remix using a structured file system.
The routing method in Remix is _OK_, but has many nuances and arbitrary rules that make it difficult to use and leaves file/folder names littered with `_`,`-`,`+` amongst other special characters with little meaning unless you know the rules.

## 🤷‍♂️ Why?
Frustration with a flat folder routing system, a project with 1000's of routes is not fun to open in VSCode, the sidebar becomes unmanageably long, scrolling up and down becomes tedious very quickly.

We want to be able to define our routes in a way that makes sense, maps to the web in a logical predictable way and is easy to keep well organized across teams.

## 💡 Concepts

- Routes are defined and nested using folders, very similar to how you'd layout HTML files on an nginx server.
- Variables are denoted using `$` in the file path, eg: `/users/$id/edit.jsx` would become `/users/123/edit`
- You can escape special characters in the file path using `[]`, eg: `/make-[$$$]-fast-online.jsx` would become `/make-$$$-fast-online`
- `_layout.jsx`/`layout.tsx` files affect all routes downstream.
- `index.jsx`/`index.tsx` files are the default file for a folder, eg: `/users/index.jsx` would become `/users`
- Files not ending in `.jsx`, `.tsx`, `.js`, `.ts` are ignored, allowing you to keep assets and other files in the same folder as your routes.
- You can replace folders with a "virtual" folder using a `.` in the filename, eg: `/users.$id.edit.jsx` would become `/users/123/edit`.
- Folders can be invisible for organization purposes, just suffix it with a `+`, eg: `/legal-pages+/privacy-policy.jsx` would become `/privacy-policy`

## 🔮 Example

### 📂 File System
```
├── index.jsx
├── users
│   ├── index.jsx
│   ├── $id
│   │   ├── index.jsx
│   │   ├── edit.jsx
│   │   └── _layout.jsx
│   ├── _layout.jsx
|   └── $id.view.jsx
├── legal-pages+
│   └── privacy-policy.jsx
└── _layout.jsx
```

### 🧬 Routes Generated
```
index.jsx -> /
users/index.jsx -> /users
users/$id/index.jsx -> /users/$id
users/$id/edit.jsx -> /users/$id/edit
users/$id.view.jsx -> /users/$id/view
legal-pages+/privacy-policy.jsx -> /privacy-policy
```
✨ See how super simple that is!

## 🔨 Usage

### 🚀 Install the package:
`npm install -D remix-kiss-routes`

### 💿 Remix Config
```js
// remix.config.js
const { kissRoutes } = require('remix-kiss-routes');


/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
    ignoredRouteFiles: ["**/*"],
    routes: async defineRoutes => {
        return kissRoutes('./app', ['routes']);
    },
}
```

Parameters:
- `appDir` - The root directory of your app, this is where your `root.jsx` file is located.
- `routeDirs` - The directory containing your routes, this is relative to `appDir`. single path string, or array of paths. Defaults to `routes`.