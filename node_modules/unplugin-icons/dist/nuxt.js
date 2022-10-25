"use strict";Object.defineProperty(exports, "__esModule", {value: true});

var _chunkZY22PK6Ojs = require('./chunk-ZY22PK6O.js');
require('./chunk-6F4PWJZI.js');

// src/nuxt.ts
function nuxt_default(options = {}) {
  var _a, _b;
  if ((_b = (_a = this.nuxt) == null ? void 0 : _a._version) == null ? void 0 : _b.startsWith("3."))
    options.compiler = "vue3";
  this.nuxt.hook("webpack:config", (configs) => {
    configs.forEach((config) => {
      config.plugins = config.plugins || [];
      config.plugins.unshift(_chunkZY22PK6Ojs.src_default.webpack(options));
    });
  });
  this.nuxt.hook("vite:extend", async (vite) => {
    vite.config.plugins = vite.config.plugins || [];
    vite.config.plugins.push(_chunkZY22PK6Ojs.src_default.vite(options));
  });
}


module.exports = nuxt_default;
exports.default = module.exports;