// 生成物 —— scripts/compile-templates.mjs 自 src/ui/templates.ts 编译（@vue/compiler-dom 3.5.35 prod）。勿手改：改模板后 npm run build。
// 用途：宿主把整个 Vue 模块递进来时（VueRuntime 里有下面 HELPERS 的全部），图库用这些 render 函数、运行时不编译模板 = CSP 不用放行 eval。0.8.4
/* eslint-disable */
// @ts-nocheck
export const COMPILED_WITH_VUE = "3.5.35";
/** render 函数要从宿主的 Vue 里拿的 helper；缺任何一个 = 退回运行时编译。 */
export const HELPERS: readonly string[] = ["Fragment","Teleport","createBlock","createCommentVNode","createElementBlock","createElementVNode","createTextVNode","createVNode","normalizeClass","normalizeStyle","openBlock","renderList","resolveComponent","toDisplayString","vShow","withDirectives","withModifiers"];

export function thumbCellRender(Vue: any): any {
  const { normalizeClass: _normalizeClass, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode, withModifiers: _withModifiers, toDisplayString: _toDisplayString, createTextVNode: _createTextVNode, Fragment: _Fragment } = Vue
  
  const _hoisted_1 = ["src", "alt", "title"]
  const _hoisted_2 = ["title"]
  const _hoisted_3 = ["innerHTML"]
  const _hoisted_4 = {
    key: 2,
    class: "gallery-tile-thumb placeholder",
    ref: "root"
  }
  const _hoisted_5 = ["innerHTML"]
  const _hoisted_6 = ["innerHTML"]
  
  return function render(_ctx, _cache) {
    return (_ctx.url)
      ? (_openBlock(), _createElementBlock("img", {
          key: 0,
          class: _normalizeClass(["gallery-tile-thumb", { pixelated: _ctx.pixelated }]),
          src: _ctx.url,
          alt: _ctx.alt,
          title: _ctx.blurb || null,
          loading: "lazy",
          onLoad: _cache[0] || (_cache[0] = (...args) => (_ctx.onThumbLoad && _ctx.onThumbLoad(...args)))
        }, null, 42 /* CLASS, PROPS, NEED_HYDRATION */, _hoisted_1))
      : (_ctx.locked)
        ? (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "gallery-tile-thumb placeholder locked",
            title: _ctx.lockedTitle,
            onClick: _cache[1] || (_cache[1] = _withModifiers($event => (_ctx.$emit('unlock', _ctx.encName || _ctx.alt)), ["stop"]))
          }, [
            _createElementVNode("span", {
              style: {"width":"42px","height":"42px","display":"inline-block"},
              innerHTML: _ctx.ICON.lock
            }, null, 8 /* PROPS */, _hoisted_3)
          ], 8 /* PROPS */, _hoisted_2))
        : (_openBlock(), _createElementBlock("div", _hoisted_4, [
            (_ctx.showCloud)
              ? (_openBlock(), _createElementBlock("span", {
                  key: 0,
                  style: {"width":"48px","height":"48px","display":"inline-block"},
                  innerHTML: _ctx.ICON.cloudBig
                }, null, 8 /* PROPS */, _hoisted_5))
              : (_ctx.fallbackHtml)
                ? (_openBlock(), _createElementBlock("span", {
                    key: 1,
                    class: "gallery-tile-ph-icon",
                    innerHTML: _ctx.fallbackHtml
                  }, null, 8 /* PROPS */, _hoisted_6))
                : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                    _createTextVNode(_toDisplayString(_ctx.fallback), 1 /* TEXT */)
                  ], 64 /* STABLE_FRAGMENT */))
          ], 512 /* NEED_PATCH */))
  }
}

export function imageThumbCellRender(Vue: any): any {
  const { normalizeClass: _normalizeClass, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString } = Vue
  
  const _hoisted_1 = ["src", "alt"]
  
  return function render(_ctx, _cache) {
    return (_ctx.url)
      ? (_openBlock(), _createElementBlock("img", {
          key: 0,
          class: _normalizeClass(["gallery-tile-thumb", { pixelated: _ctx.pixelated }]),
          src: _ctx.url,
          alt: _ctx.alt,
          loading: "lazy",
          onLoad: _cache[0] || (_cache[0] = (...args) => (_ctx.onThumbLoad && _ctx.onThumbLoad(...args)))
        }, null, 42 /* CLASS, PROPS, NEED_HYDRATION */, _hoisted_1))
      : (_openBlock(), _createElementBlock("div", {
          key: 1,
          class: "gallery-tile-thumb placeholder",
          ref: "root"
        }, _toDisplayString(_ctx.fallback), 513 /* TEXT, NEED_PATCH */))
  }
}

export function galleryRender(Vue: any): any {
  const { renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, normalizeClass: _normalizeClass, createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, withModifiers: _withModifiers, Teleport: _Teleport, createBlock: _createBlock, resolveComponent: _resolveComponent, createVNode: _createVNode, vShow: _vShow, normalizeStyle: _normalizeStyle, withDirectives: _withDirectives } = Vue
  
  const _hoisted_1 = {
    key: 0,
    class: "sep"
  }
  const _hoisted_2 = ["onClick"]
  const _hoisted_3 = {
    key: 0,
    class: "gallery-loading"
  }
  const _hoisted_4 = { class: "gallery-stalled" }
  const _hoisted_5 = { class: "gallery-stalled-actions" }
  const _hoisted_6 = ["onClick"]
  const _hoisted_7 = ["innerHTML"]
  const _hoisted_8 = { class: "gallery-tile-name-row" }
  const _hoisted_9 = ["title"]
  const _hoisted_10 = { class: "gallery-tile-meta" }
  const _hoisted_11 = ["aria-label", "onClick"]
  const _hoisted_12 = ["data-menu"]
  const _hoisted_13 = ["onClick"]
  const _hoisted_14 = ["onClick"]
  const _hoisted_15 = ["innerHTML"]
  const _hoisted_16 = {
    key: 1,
    class: "gallery-tile-action-slot"
  }
  const _hoisted_17 = ["title", "aria-label", "onClick", "innerHTML"]
  const _hoisted_18 = ["title", "innerHTML"]
  const _hoisted_19 = { class: "gallery-tile-name-row" }
  const _hoisted_20 = {
    key: 0,
    class: "gallery-tile-active-tag"
  }
  const _hoisted_21 = ["title"]
  const _hoisted_22 = ["title"]
  const _hoisted_23 = ["title"]
  const _hoisted_24 = { class: "gallery-tile-meta" }
  const _hoisted_25 = ["title", "innerHTML"]
  const _hoisted_26 = ["title", "innerHTML"]
  const _hoisted_27 = ["aria-label", "onClick"]
  const _hoisted_28 = ["data-menu"]
  const _hoisted_29 = { class: "gallery-menu-note" }
  const _hoisted_30 = ["onClick"]
  const _hoisted_31 = ["onClick"]
  const _hoisted_32 = ["onClick"]
  const _hoisted_33 = ["onClick"]
  const _hoisted_34 = ["onClick"]
  const _hoisted_35 = ["onClick"]
  const _hoisted_36 = ["onClick"]
  const _hoisted_37 = ["onClick"]
  const _hoisted_38 = ["onClick"]
  const _hoisted_39 = ["onClick"]
  const _hoisted_40 = ["onClick"]
  const _hoisted_41 = ["onClick"]
  const _hoisted_42 = ["onClick"]
  const _hoisted_43 = ["onClick"]
  const _hoisted_44 = { class: "gallery-tile-name-row" }
  const _hoisted_45 = ["title"]
  const _hoisted_46 = { class: "gallery-tile-meta" }
  const _hoisted_47 = ["title", "innerHTML"]
  const _hoisted_48 = ["aria-label", "onClick"]
  const _hoisted_49 = ["data-menu"]
  const _hoisted_50 = ["onClick"]
  const _hoisted_51 = ["innerHTML"]
  const _hoisted_52 = { class: "gallery-tile-name-row" }
  const _hoisted_53 = ["title"]
  const _hoisted_54 = { class: "gallery-tile-meta" }
  const _hoisted_55 = ["title", "innerHTML"]
  const _hoisted_56 = ["innerHTML"]
  const _hoisted_57 = ["title", "innerHTML"]
  const _hoisted_58 = { class: "gallery-tile-name-row" }
  const _hoisted_59 = ["title"]
  const _hoisted_60 = ["title"]
  const _hoisted_61 = ["aria-label", "onClick"]
  const _hoisted_62 = ["data-menu"]
  const _hoisted_63 = ["onClick"]
  const _hoisted_64 = ["onClick"]
  
  return function render(_ctx, _cache) {
    const _component_ThumbCell = _resolveComponent("ThumbCell")
    const _component_ImageThumbCell = _resolveComponent("ImageThumbCell")
  
    return (_openBlock(), _createElementBlock(_Fragment, null, [
      (_ctx.view==='files')
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: _normalizeClass(["gallery-breadcrumb", { hidden: !_ctx.folder }])
          }, [
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.crumbs, (c, i) => {
              return (_openBlock(), _createElementBlock(_Fragment, {
                key: c.path
              }, [
                (i>0)
                  ? (_openBlock(), _createElementBlock("span", _hoisted_1, "›"))
                  : _createCommentVNode("v-if", true),
                _createElementVNode("button", {
                  type: "button",
                  class: _normalizeClass({ current: c.current }),
                  onClick: $event => (!c.current && _ctx.setFolder(c.path))
                }, _toDisplayString(c.label), 11 /* TEXT, CLASS, PROPS */, _hoisted_2)
              ], 64 /* STABLE_FRAGMENT */))
            }), 128 /* KEYED_FRAGMENT */))
          ], 2 /* CLASS */))
        : _createCommentVNode("v-if", true),
      _withDirectives(_createElementVNode("div", {
        class: _normalizeClass(["gallery-grid", { tall: _ctx.tileTall, list: _ctx.layout==='list' }]),
        style: _normalizeStyle(_ctx.tileStyle)
      }, [
        (_ctx.loading)
          ? (_openBlock(), _createElementBlock("div", _hoisted_3, [
              (!_ctx.stalled)
                ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                    _createTextVNode(_toDisplayString(_ctx.L.loading), 1 /* TEXT */)
                  ], 64 /* STABLE_FRAGMENT */))
                : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                    _createElementVNode("div", _hoisted_4, _toDisplayString(_ctx.stalled), 1 /* TEXT */),
                    _createElementVNode("div", _hoisted_5, [
                      _createElementVNode("button", {
                        type: "button",
                        class: "sheet-action ghost gallery-retry-btn",
                        onClick: _cache[0] || (_cache[0] = (...args) => (_ctx.retry && _ctx.retry(...args)))
                      }, _toDisplayString(_ctx.L.retry), 1 /* TEXT */),
                      _createElementVNode("button", {
                        type: "button",
                        class: "sheet-action ghost",
                        onClick: _cache[1] || (_cache[1] = (...args) => (_ctx.openDiag && _ctx.openDiag(...args)))
                      }, _toDisplayString(_ctx.L.openDiag), 1 /* TEXT */),
                      _createElementVNode("button", {
                        type: "button",
                        class: "sheet-action ghost",
                        onClick: _cache[2] || (_cache[2] = (...args) => (_ctx.reloadApp && _ctx.reloadApp(...args)))
                      }, _toDisplayString(_ctx.L.reload), 1 /* TEXT */)
                    ])
                  ], 64 /* STABLE_FRAGMENT */))
            ]))
          : _createCommentVNode("v-if", true),
        (_ctx.view==='files' && !_ctx.loading)
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.folderTiles, (ft) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: 'F:'+ft.path,
                  class: "gallery-tile folder",
                  onClick: $event => (_ctx.enterFolder(ft.path))
                }, [
                  _createElementVNode("div", {
                    class: "gallery-tile-thumb",
                    innerHTML: _ctx.ICON.folder
                  }, null, 8 /* PROPS */, _hoisted_7),
                  _createElementVNode("div", _hoisted_8, [
                    _createElementVNode("div", {
                      class: "gallery-tile-name",
                      title: ft.path
                    }, _toDisplayString(ft.name), 9 /* TEXT, PROPS */, _hoisted_9),
                    _createElementVNode("div", _hoisted_10, _toDisplayString(_ctx.L.folder), 1 /* TEXT */)
                  ]),
                  _createElementVNode("button", {
                    type: "button",
                    class: "gallery-tile-menu-btn",
                    "aria-label": _ctx.L.more,
                    onClick: _withModifiers($event => (_ctx.toggleMenu('F:'+ft.path, $event)), ["stop"])
                  }, [...(_cache[8] || (_cache[8] = [
                    _createElementVNode("svg", {
                      viewBox: "0 0 24 24",
                      "aria-hidden": "true"
                    }, [
                      _createElementVNode("use", { href: "#more" })
                    ], -1 /* CACHED */)
                  ]))], 8 /* PROPS */, _hoisted_11),
                  (_openBlock(), _createBlock(_Teleport, { to: _ctx.menuMount }, [
                    _createElementVNode("div", {
                      class: "gallery-tile-menu-popup hidden",
                      "data-menu": 'F:'+ft.path,
                      onClick: _cache[3] || (_cache[3] = _withModifiers(() => {}, ["stop"]))
                    }, [
                      _createElementVNode("button", {
                        type: "button",
                        class: "danger",
                        onClick: $event => (_ctx.folderDelete(ft))
                      }, [
                        _cache[9] || (_cache[9] = _createElementVNode("svg", {
                          viewBox: "0 0 24 24",
                          "aria-hidden": "true"
                        }, [
                          _createElementVNode("use", { href: "#trash-can" })
                        ], -1 /* CACHED */)),
                        _createElementVNode("span", null, _toDisplayString(_ctx.L.delEmptyFolder), 1 /* TEXT */)
                      ], 8 /* PROPS */, _hoisted_13)
                    ], 8 /* PROPS */, _hoisted_12)
                  ], 8 /* PROPS */, ["to"]))
                ], 8 /* PROPS */, _hoisted_6))
              }), 128 /* KEYED_FRAGMENT */)),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.fileTiles, (row) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: row.t.identifier,
                  class: _normalizeClass(["gallery-tile", { active: row.t.isActive, encrypted: row.t.encrypted }]),
                  onClick: $event => (_ctx.openTile(row.item))
                }, [
                  _createVNode(_component_ThumbCell, {
                    "enc-name": row.t.encrypted && row.thumb ? row.t.identifier : null,
                    fetchable: !row.t.encrypted && (row.t.hasCloud || row.t.hasLocal) && row.thumb,
                    "is-cloud": !row.t.hasLocal && row.t.hasCloud,
                    "cloud-newer": row.t.cloudNewer,
                    "thumb-token": String(row.t.time || row.t.size || 0),
                    fallback: row.t.stem.slice(0,1) || '?',
                    "fallback-html": _ctx.phHtml(row.t.identifier, row.info),
                    alt: row.t.identifier,
                    onUnlock: _ctx.onUnlock
                  }, null, 8 /* PROPS */, ["enc-name", "fetchable", "is-cloud", "cloud-newer", "thumb-token", "fallback", "fallback-html", "alt", "onUnlock"]),
                  (row.ov)
                    ? (_openBlock(), _createElementBlock("span", {
                        key: 0,
                        class: "gallery-tile-overlay",
                        innerHTML: row.ov
                      }, null, 8 /* PROPS */, _hoisted_15))
                    : _createCommentVNode("v-if", true),
                  (row.act)
                    ? (_openBlock(), _createElementBlock("span", _hoisted_16, [
                        _createElementVNode("button", {
                          type: "button",
                          class: _normalizeClass(["gallery-tile-action", row.act.state || 'ready']),
                          title: row.act.title,
                          "aria-label": row.act.title,
                          onClick: _withModifiers($event => (_ctx.tileAction(row.item)), ["stop"]),
                          onPointerdown: _cache[4] || (_cache[4] = _withModifiers(() => {}, ["stop"])),
                          innerHTML: _ctx.badgeIcon2(row.act.icon)
                        }, null, 42 /* CLASS, PROPS, NEED_HYDRATION */, _hoisted_17)
                      ]))
                    : _createCommentVNode("v-if", true),
                  (row.t.encrypted)
                    ? (_openBlock(), _createElementBlock("span", {
                        key: 2,
                        class: "gallery-tile-lockmark",
                        title: _ctx.L.encrypted,
                        innerHTML: _ctx.ICON.lock
                      }, null, 8 /* PROPS */, _hoisted_18))
                    : _createCommentVNode("v-if", true),
                  _createElementVNode("div", _hoisted_19, [
                    (row.t.isActive)
                      ? (_openBlock(), _createElementBlock("span", _hoisted_20, _toDisplayString(_ctx.L.activeTag), 1 /* TEXT */))
                      : _createCommentVNode("v-if", true),
                    _createElementVNode("div", {
                      class: "gallery-tile-name",
                      title: row.t.identifier
                    }, [
                      (row.marker==='unread')
                        ? (_openBlock(), _createElementBlock("span", {
                            key: 0,
                            class: "gallery-marker unread",
                            title: _ctx.L.unread
                          }, null, 8 /* PROPS */, _hoisted_22))
                        : _createCommentVNode("v-if", true),
                      _createTextVNode(_toDisplayString(row.t.stem), 1 /* TEXT */)
                    ], 8 /* PROPS */, _hoisted_21),
                    (row.sub)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 1,
                          class: "gallery-tile-sub",
                          title: row.sub
                        }, _toDisplayString(row.sub), 9 /* TEXT, PROPS */, _hoisted_23))
                      : _createCommentVNode("v-if", true),
                    _createElementVNode("div", _hoisted_24, [
                      (row.t.encrypted)
                        ? (_openBlock(), _createElementBlock("span", {
                            key: 0,
                            class: "gallery-tile-state-icon enc",
                            title: _ctx.L.encrypted,
                            innerHTML: _ctx.ICON.lock
                          }, null, 8 /* PROPS */, _hoisted_25))
                        : _createCommentVNode("v-if", true),
                      _createElementVNode("span", {
                        class: _normalizeClass('gallery-tile-state-icon b-' + row.t.badge),
                        title: row.t.badgeTitle,
                        innerHTML: _ctx.badgeIcon(row.t.badge)
                      }, null, 10 /* CLASS, PROPS */, _hoisted_26),
                      _createElementVNode("span", null, _toDisplayString(_ctx.fmtMeta(row.t)), 1 /* TEXT */)
                    ])
                  ]),
                  _createElementVNode("button", {
                    type: "button",
                    class: "gallery-tile-menu-btn",
                    "aria-label": _ctx.L.more,
                    onClick: _withModifiers($event => (_ctx.toggleMenu(row.t.identifier, $event)), ["stop"])
                  }, [...(_cache[10] || (_cache[10] = [
                    _createElementVNode("svg", {
                      viewBox: "0 0 24 24",
                      "aria-hidden": "true"
                    }, [
                      _createElementVNode("use", { href: "#more" })
                    ], -1 /* CACHED */)
                  ]))], 8 /* PROPS */, _hoisted_27),
                  (_openBlock(), _createBlock(_Teleport, { to: _ctx.menuMount }, [
                    _createElementVNode("div", {
                      class: "gallery-tile-menu-popup hidden",
                      "data-menu": row.t.identifier,
                      onClick: _cache[5] || (_cache[5] = _withModifiers(() => {}, ["stop"]))
                    }, [
                      (row.t.ghost)
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                            _createElementVNode("div", _hoisted_29, _toDisplayString(_ctx.L.divergedNote), 1 /* TEXT */),
                            _createElementVNode("button", {
                              type: "button",
                              onClick: $event => (_ctx.rename(row.item))
                            }, [
                              _cache[11] || (_cache[11] = _createElementVNode("svg", {
                                viewBox: "0 0 24 24",
                                "aria-hidden": "true"
                              }, [
                                _createElementVNode("use", { href: "#rename" })
                              ], -1 /* CACHED */)),
                              _createElementVNode("span", null, _toDisplayString(_ctx.L.renameKeep), 1 /* TEXT */)
                            ], 8 /* PROPS */, _hoisted_30),
                            _createElementVNode("button", {
                              type: "button",
                              class: "danger",
                              onClick: $event => (_ctx.del(row.item))
                            }, [
                              _cache[12] || (_cache[12] = _createElementVNode("svg", {
                                viewBox: "0 0 24 24",
                                "aria-hidden": "true"
                              }, [
                                _createElementVNode("use", { href: "#trash-can" })
                              ], -1 /* CACHED */)),
                              _createElementVNode("span", null, _toDisplayString(_ctx.L.discardToTrash), 1 /* TEXT */)
                            ], 8 /* PROPS */, _hoisted_31)
                          ], 64 /* STABLE_FRAGMENT */))
                        : (row.t.pendingGone)
                          ? (_openBlock(), _createElementBlock("button", {
                              key: 1,
                              type: "button",
                              onClick: $event => (_ctx.resolve(row.item))
                            }, [
                              _cache[13] || (_cache[13] = _createElementVNode("svg", {
                                viewBox: "0 0 24 24",
                                "aria-hidden": "true"
                              }, [
                                _createElementVNode("use", { href: "#cloud-pending" })
                              ], -1 /* CACHED */)),
                              _createElementVNode("span", null, _toDisplayString(_ctx.L.resolve), 1 /* TEXT */)
                            ], 8 /* PROPS */, _hoisted_32))
                          : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                              _createElementVNode("button", {
                                type: "button",
                                onClick: $event => (_ctx.rename(row.item))
                              }, [
                                _cache[14] || (_cache[14] = _createElementVNode("svg", {
                                  viewBox: "0 0 24 24",
                                  "aria-hidden": "true"
                                }, [
                                  _createElementVNode("use", { href: "#rename" })
                                ], -1 /* CACHED */)),
                                _createElementVNode("span", null, _toDisplayString(_ctx.L.rename), 1 /* TEXT */)
                              ], 8 /* PROPS */, _hoisted_33),
                              _createElementVNode("button", {
                                type: "button",
                                onClick: $event => (_ctx.move(row.item))
                              }, [
                                _cache[15] || (_cache[15] = _createElementVNode("svg", {
                                  viewBox: "0 0 24 24",
                                  "aria-hidden": "true"
                                }, [
                                  _createElementVNode("use", { href: "#move-to-folder" })
                                ], -1 /* CACHED */)),
                                _createElementVNode("span", null, _toDisplayString(_ctx.L.moveTo), 1 /* TEXT */)
                              ], 8 /* PROPS */, _hoisted_34),
                              _createElementVNode("button", {
                                type: "button",
                                onClick: $event => (_ctx.copy(row.item))
                              }, [
                                _cache[16] || (_cache[16] = _createElementVNode("svg", {
                                  viewBox: "0 0 24 24",
                                  "aria-hidden": "true"
                                }, [
                                  _createElementVNode("use", { href: "#copy" })
                                ], -1 /* CACHED */)),
                                _createElementVNode("span", null, _toDisplayString(_ctx.L.copy), 1 /* TEXT */)
                              ], 8 /* PROPS */, _hoisted_35),
                              (row.t.badge==='cloudOnly')
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 0,
                                    type: "button",
                                    onClick: $event => (_ctx.openTile(row.item))
                                  }, [
                                    _cache[17] || (_cache[17] = _createElementVNode("svg", {
                                      viewBox: "0 0 24 24",
                                      "aria-hidden": "true"
                                    }, [
                                      _createElementVNode("use", { href: "#download" })
                                    ], -1 /* CACHED */)),
                                    _createElementVNode("span", null, _toDisplayString(_ctx.L.pullLocal), 1 /* TEXT */)
                                  ], 8 /* PROPS */, _hoisted_36))
                                : _createCommentVNode("v-if", true),
                              (row.t.badge==='cloudOnly')
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 1,
                                    type: "button",
                                    onClick: $event => (_ctx.keepOffline(row.item))
                                  }, [
                                    _cache[18] || (_cache[18] = _createElementVNode("svg", {
                                      viewBox: "0 0 24 24",
                                      "aria-hidden": "true"
                                    }, [
                                      _createElementVNode("use", { href: "#local-cache" })
                                    ], -1 /* CACHED */)),
                                    _createElementVNode("span", null, _toDisplayString(_ctx.L.keepOffline), 1 /* TEXT */)
                                  ], 8 /* PROPS */, _hoisted_37))
                                : _createCommentVNode("v-if", true),
                              (row.t.badge==='localOnly' || row.t.badge==='float' || row.t.badge==='dirtyBoth' || row.t.badge==='conflictBoth')
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 2,
                                    type: "button",
                                    onClick: $event => (_ctx.resolve(row.item))
                                  }, [
                                    _cache[19] || (_cache[19] = _createElementVNode("svg", {
                                      viewBox: "0 0 24 24",
                                      "aria-hidden": "true"
                                    }, [
                                      _createElementVNode("use", { href: "#cloud-pending" })
                                    ], -1 /* CACHED */)),
                                    _createElementVNode("span", null, _toDisplayString(_ctx.L.resolve), 1 /* TEXT */)
                                  ], 8 /* PROPS */, _hoisted_38))
                                : _createCommentVNode("v-if", true),
                              (row.t.hasLocal && row.t.hasCloud)
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 3,
                                    type: "button",
                                    onClick: $event => (_ctx.unload(row.item))
                                  }, [
                                    _cache[20] || (_cache[20] = _createElementVNode("svg", {
                                      viewBox: "0 0 24 24",
                                      "aria-hidden": "true"
                                    }, [
                                      _createElementVNode("use", { href: "#unload-local-cache" })
                                    ], -1 /* CACHED */)),
                                    _createElementVNode("span", null, _toDisplayString(_ctx.L.unloadLocal), 1 /* TEXT */)
                                  ], 8 /* PROPS */, _hoisted_39))
                                : _createCommentVNode("v-if", true),
                              (_ctx.hasEncryption && row.t.hasLocal && !row.t.encrypted)
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 4,
                                    type: "button",
                                    onClick: $event => (_ctx.encryptItem(row.item))
                                  }, [
                                    _cache[21] || (_cache[21] = _createElementVNode("svg", {
                                      viewBox: "0 0 24 24",
                                      "aria-hidden": "true"
                                    }, [
                                      _createElementVNode("use", { href: "#lock" })
                                    ], -1 /* CACHED */)),
                                    _createElementVNode("span", null, _toDisplayString(_ctx.L.encrypt), 1 /* TEXT */)
                                  ], 8 /* PROPS */, _hoisted_40))
                                : _createCommentVNode("v-if", true),
                              (_ctx.hasEncryption && row.t.hasLocal && row.t.encrypted)
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 5,
                                    type: "button",
                                    onClick: $event => (_ctx.decryptItem(row.item))
                                  }, [
                                    _cache[22] || (_cache[22] = _createElementVNode("svg", {
                                      viewBox: "0 0 24 24",
                                      "aria-hidden": "true"
                                    }, [
                                      _createElementVNode("use", { href: "#unlock" })
                                    ], -1 /* CACHED */)),
                                    _createElementVNode("span", null, _toDisplayString(_ctx.L.decrypt), 1 /* TEXT */)
                                  ], 8 /* PROPS */, _hoisted_41))
                                : _createCommentVNode("v-if", true),
                              _createElementVNode("button", {
                                type: "button",
                                class: "danger",
                                onClick: $event => (_ctx.del(row.item))
                              }, [
                                _cache[23] || (_cache[23] = _createElementVNode("svg", {
                                  viewBox: "0 0 24 24",
                                  "aria-hidden": "true"
                                }, [
                                  _createElementVNode("use", { href: "#trash-can" })
                                ], -1 /* CACHED */)),
                                _createElementVNode("span", null, _toDisplayString(_ctx.L.toTrash), 1 /* TEXT */)
                              ], 8 /* PROPS */, _hoisted_42)
                            ], 64 /* STABLE_FRAGMENT */))
                    ], 8 /* PROPS */, _hoisted_28)
                  ], 8 /* PROPS */, ["to"]))
                ], 10 /* CLASS, PROPS */, _hoisted_14))
              }), 128 /* KEYED_FRAGMENT */)),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.imageTiles, (im) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: 'I:'+im.identifier,
                  class: "gallery-tile image-file",
                  onClick: $event => (_ctx.openImageTile(im.raw))
                }, [
                  _createVNode(_component_ImageThumbCell, {
                    identifier: im.identifier,
                    token: im.token,
                    fallback: im.label.slice(0,1) || '?',
                    alt: im.label
                  }, null, 8 /* PROPS */, ["identifier", "token", "fallback", "alt"]),
                  _createElementVNode("div", _hoisted_44, [
                    _createElementVNode("div", {
                      class: "gallery-tile-name",
                      title: im.identifier
                    }, _toDisplayString(im.label), 9 /* TEXT, PROPS */, _hoisted_45),
                    _createElementVNode("div", _hoisted_46, [
                      _createElementVNode("span", {
                        class: "gallery-tile-state-icon",
                        title: _ctx.L.imageFile,
                        innerHTML: _ctx.ICON.image
                      }, null, 8 /* PROPS */, _hoisted_47),
                      _createElementVNode("span", null, _toDisplayString(_ctx.fmtMeta({ time: im.time, size: im.size })), 1 /* TEXT */)
                    ])
                  ]),
                  _createElementVNode("button", {
                    type: "button",
                    class: "gallery-tile-menu-btn",
                    "aria-label": _ctx.L.more,
                    onClick: _withModifiers($event => (_ctx.toggleMenu('I:'+im.identifier, $event)), ["stop"])
                  }, [...(_cache[24] || (_cache[24] = [
                    _createElementVNode("svg", {
                      viewBox: "0 0 24 24",
                      "aria-hidden": "true"
                    }, [
                      _createElementVNode("use", { href: "#more" })
                    ], -1 /* CACHED */)
                  ]))], 8 /* PROPS */, _hoisted_48),
                  (_openBlock(), _createBlock(_Teleport, { to: _ctx.menuMount }, [
                    _createElementVNode("div", {
                      class: "gallery-tile-menu-popup hidden",
                      "data-menu": 'I:'+im.identifier,
                      onClick: _cache[6] || (_cache[6] = _withModifiers(() => {}, ["stop"]))
                    }, [
                      _createElementVNode("button", {
                        type: "button",
                        class: "danger",
                        onClick: $event => (_ctx.deleteImage(im.raw))
                      }, [
                        _cache[25] || (_cache[25] = _createElementVNode("svg", {
                          viewBox: "0 0 24 24",
                          "aria-hidden": "true"
                        }, [
                          _createElementVNode("use", { href: "#trash-can" })
                        ], -1 /* CACHED */)),
                        _createElementVNode("span", null, _toDisplayString(_ctx.L.toTrash), 1 /* TEXT */)
                      ], 8 /* PROPS */, _hoisted_50)
                    ], 8 /* PROPS */, _hoisted_49)
                  ], 8 /* PROPS */, ["to"]))
                ], 8 /* PROPS */, _hoisted_43))
              }), 128 /* KEYED_FRAGMENT */)),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.otherTiles, (ot) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: 'O:'+ot.identifier,
                  class: "gallery-tile other-file"
                }, [
                  _createElementVNode("div", {
                    class: "gallery-tile-thumb",
                    innerHTML: _ctx.ICON.file
                  }, null, 8 /* PROPS */, _hoisted_51),
                  _createElementVNode("div", _hoisted_52, [
                    _createElementVNode("div", {
                      class: "gallery-tile-name",
                      title: ot.identifier
                    }, _toDisplayString(ot.label), 9 /* TEXT, PROPS */, _hoisted_53),
                    _createElementVNode("div", _hoisted_54, [
                      _createElementVNode("span", {
                        class: "gallery-tile-state-icon",
                        title: _ctx.L.otherFile,
                        innerHTML: _ctx.ICON.file
                      }, null, 8 /* PROPS */, _hoisted_55),
                      _createElementVNode("span", null, _toDisplayString(_ctx.fmtMeta({ time: ot.time, size: ot.size })), 1 /* TEXT */)
                    ])
                  ])
                ]))
              }), 128 /* KEYED_FRAGMENT */))
            ], 64 /* STABLE_FRAGMENT */))
          : _createCommentVNode("v-if", true),
        (_ctx.view!=='files' && !_ctx.loading)
          ? (_openBlock(true), _createElementBlock(_Fragment, { key: 2 }, _renderList(_ctx.asideTiles, (row) => {
              return (_openBlock(), _createElementBlock("div", {
                key: row.t.key,
                class: _normalizeClass(["gallery-tile aside", ['aside-' + row.item.box, { encrypted: row.item.encrypted }]])
              }, [
                _createVNode(_component_ThumbCell, {
                  fetchable: row.fetch,
                  "is-cloud": row.fetch && row.item.side==='cloud',
                  "thumb-token": "0",
                  fallback: row.t.stem.slice(0,1) || '?',
                  "fallback-html": row.item.kind != null ? _ctx.phHtml(row.t.identifier, row.info) : '',
                  alt: row.t.identifier
                }, null, 8 /* PROPS */, ["fetchable", "is-cloud", "fallback", "fallback-html", "alt"]),
                (row.ov)
                  ? (_openBlock(), _createElementBlock("span", {
                      key: 0,
                      class: "gallery-tile-overlay",
                      innerHTML: row.ov
                    }, null, 8 /* PROPS */, _hoisted_56))
                  : _createCommentVNode("v-if", true),
                (row.item.encrypted)
                  ? (_openBlock(), _createElementBlock("span", {
                      key: 1,
                      class: "gallery-tile-lockmark",
                      title: _ctx.L.encrypted,
                      innerHTML: _ctx.ICON.lock
                    }, null, 8 /* PROPS */, _hoisted_57))
                  : _createCommentVNode("v-if", true),
                _createElementVNode("div", _hoisted_58, [
                  _createElementVNode("div", {
                    class: "gallery-tile-name",
                    title: row.t.identifier
                  }, _toDisplayString(row.t.stem), 9 /* TEXT, PROPS */, _hoisted_59),
                  _createElementVNode("div", {
                    class: "gallery-tile-meta",
                    title: _ctx.fullTime(row.t.at)
                  }, _toDisplayString(row.t.source) + " · " + _toDisplayString(_ctx.humanTime(row.t.at)) + " " + _toDisplayString(row.atWord), 9 /* TEXT, PROPS */, _hoisted_60)
                ]),
                _createElementVNode("button", {
                  type: "button",
                  class: "gallery-tile-menu-btn",
                  "aria-label": _ctx.L.more,
                  onClick: _withModifiers($event => (_ctx.toggleMenu('A:'+row.t.key, $event)), ["stop"])
                }, [...(_cache[26] || (_cache[26] = [
                  _createElementVNode("svg", {
                    viewBox: "0 0 24 24",
                    "aria-hidden": "true"
                  }, [
                    _createElementVNode("use", { href: "#more" })
                  ], -1 /* CACHED */)
                ]))], 8 /* PROPS */, _hoisted_61),
                (_openBlock(), _createBlock(_Teleport, { to: _ctx.menuMount }, [
                  _createElementVNode("div", {
                    class: "gallery-tile-menu-popup hidden",
                    "data-menu": 'A:'+row.t.key,
                    onClick: _cache[7] || (_cache[7] = _withModifiers(() => {}, ["stop"]))
                  }, [
                    _createElementVNode("button", {
                      type: "button",
                      onClick: $event => (_ctx.asideRestore(row.item))
                    }, [
                      _cache[27] || (_cache[27] = _createElementVNode("svg", {
                        viewBox: "0 0 24 24",
                        "aria-hidden": "true"
                      }, [
                        _createElementVNode("use", { href: "#restore-trash" })
                      ], -1 /* CACHED */)),
                      _createElementVNode("span", null, _toDisplayString(_ctx.L.restore), 1 /* TEXT */)
                    ], 8 /* PROPS */, _hoisted_63),
                    _createElementVNode("button", {
                      type: "button",
                      class: "danger",
                      onClick: $event => (_ctx.asidePurge(row.item))
                    }, [
                      _cache[28] || (_cache[28] = _createElementVNode("svg", {
                        viewBox: "0 0 24 24",
                        "aria-hidden": "true"
                      }, [
                        _createElementVNode("use", { href: "#trash-can" })
                      ], -1 /* CACHED */)),
                      _createElementVNode("span", null, _toDisplayString(_ctx.L.purge), 1 /* TEXT */)
                    ], 8 /* PROPS */, _hoisted_64)
                  ], 8 /* PROPS */, _hoisted_62)
                ], 8 /* PROPS */, ["to"]))
              ], 2 /* CLASS */))
            }), 128 /* KEYED_FRAGMENT */))
          : _createCommentVNode("v-if", true)
      ], 6 /* CLASS, STYLE */), [
        [_vShow, !_ctx.isEmpty || _ctx.loading]
      ]),
      _withDirectives(_createElementVNode("div", { class: "gallery-empty" }, _toDisplayString(_ctx.emptyText), 513 /* TEXT, NEED_PATCH */), [
        [_vShow, _ctx.isEmpty && !_ctx.loading]
      ])
    ], 64 /* STABLE_FRAGMENT */))
  }
}
