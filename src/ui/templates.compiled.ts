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
    key: 1,
    class: "gallery-breadcrumb gallery-attention-bar"
  }
  const _hoisted_4 = { class: "gallery-attention-text" }
  const _hoisted_5 = {
    key: 2,
    class: "gallery-breadcrumb gallery-marks-bar"
  }
  const _hoisted_6 = { class: "gallery-marks-text" }
  const _hoisted_7 = { class: "gallery-marks-text" }
  const _hoisted_8 = {
    key: 3,
    class: "gallery-breadcrumb gallery-aside-bar"
  }
  const _hoisted_9 = {
    key: 0,
    class: "gallery-loading"
  }
  const _hoisted_10 = { class: "gallery-stalled" }
  const _hoisted_11 = { class: "gallery-stalled-actions" }
  const _hoisted_12 = ["onClick"]
  const _hoisted_13 = ["innerHTML"]
  const _hoisted_14 = { class: "gallery-tile-name-row" }
  const _hoisted_15 = ["title"]
  const _hoisted_16 = { class: "gallery-tile-meta" }
  const _hoisted_17 = ["aria-label", "onClick"]
  const _hoisted_18 = ["data-menu"]
  const _hoisted_19 = ["onClick"]
  const _hoisted_20 = ["onClick"]
  const _hoisted_21 = ["innerHTML"]
  const _hoisted_22 = ["onClick"]
  const _hoisted_23 = ["innerHTML"]
  const _hoisted_24 = {
    key: 1,
    class: "gallery-tile-action-slot"
  }
  const _hoisted_25 = ["title", "aria-label", "onClick"]
  const _hoisted_26 = ["innerHTML"]
  const _hoisted_27 = {
    key: 0,
    class: "gallery-tile-action-label"
  }
  const _hoisted_28 = ["title", "innerHTML"]
  const _hoisted_29 = {
    key: 3,
    class: "gallery-tile-versions-slot"
  }
  const _hoisted_30 = ["title", "aria-label", "onClick"]
  const _hoisted_31 = { class: "gallery-tile-name-row" }
  const _hoisted_32 = {
    key: 0,
    class: "gallery-tile-active-tag"
  }
  const _hoisted_33 = ["title"]
  const _hoisted_34 = ["title"]
  const _hoisted_35 = ["title", "innerHTML"]
  const _hoisted_36 = ["title"]
  const _hoisted_37 = { class: "gallery-tile-meta" }
  const _hoisted_38 = ["title", "innerHTML"]
  const _hoisted_39 = ["title", "innerHTML"]
  const _hoisted_40 = ["title", "innerHTML"]
  const _hoisted_41 = ["aria-label", "onClick"]
  const _hoisted_42 = ["data-menu"]
  const _hoisted_43 = { class: "gallery-menu-note" }
  const _hoisted_44 = ["onClick"]
  const _hoisted_45 = ["onClick"]
  const _hoisted_46 = ["onClick"]
  const _hoisted_47 = ["onClick"]
  const _hoisted_48 = ["onClick"]
  const _hoisted_49 = ["onClick"]
  const _hoisted_50 = ["onClick"]
  const _hoisted_51 = ["onClick"]
  const _hoisted_52 = ["onClick"]
  const _hoisted_53 = ["onClick"]
  const _hoisted_54 = ["onClick"]
  const _hoisted_55 = ["onClick"]
  const _hoisted_56 = ["onClick"]
  const _hoisted_57 = ["onClick"]
  const _hoisted_58 = ["onClick"]
  const _hoisted_59 = ["onClick"]
  const _hoisted_60 = ["onClick"]
  const _hoisted_61 = ["onClick"]
  const _hoisted_62 = ["onClick"]
  const _hoisted_63 = ["onClick"]
  const _hoisted_64 = ["onClick"]
  const _hoisted_65 = ["onClick"]
  const _hoisted_66 = ["onClick"]
  const _hoisted_67 = { class: "gallery-tile-name-row" }
  const _hoisted_68 = ["title"]
  const _hoisted_69 = { class: "gallery-tile-meta" }
  const _hoisted_70 = ["title", "innerHTML"]
  const _hoisted_71 = ["aria-label", "onClick"]
  const _hoisted_72 = ["data-menu"]
  const _hoisted_73 = ["onClick"]
  const _hoisted_74 = ["innerHTML"]
  const _hoisted_75 = { class: "gallery-tile-name-row" }
  const _hoisted_76 = ["title"]
  const _hoisted_77 = { class: "gallery-tile-meta" }
  const _hoisted_78 = ["title", "innerHTML"]
  const _hoisted_79 = ["innerHTML"]
  const _hoisted_80 = ["title", "innerHTML"]
  const _hoisted_81 = { class: "gallery-tile-name-row" }
  const _hoisted_82 = ["title"]
  const _hoisted_83 = ["title"]
  const _hoisted_84 = ["aria-label", "onClick"]
  const _hoisted_85 = ["data-menu"]
  const _hoisted_86 = ["onClick"]
  const _hoisted_87 = ["onClick"]
  
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
      (_ctx.view==='files' && !_ctx.loading && _ctx.attentionCount>0)
        ? (_openBlock(), _createElementBlock("div", _hoisted_3, [
            _createElementVNode("span", _hoisted_4, _toDisplayString(_ctx.attentionText), 1 /* TEXT */),
            _createElementVNode("button", {
              type: "button",
              class: "gallery-attention-toggle",
              onClick: _cache[0] || (_cache[0] = (...args) => (_ctx.toggleAttentionOnly && _ctx.toggleAttentionOnly(...args)))
            }, _toDisplayString(_ctx.attentionOnly ? _ctx.L.attentionAll : _ctx.L.attentionList), 1 /* TEXT */)
          ]))
        : _createCommentVNode("v-if", true),
      (_ctx.view==='files' && !_ctx.loading && !_ctx.attentionOnly && (_ctx.starredCount>0 || _ctx.foldedN>0))
        ? (_openBlock(), _createElementBlock("div", _hoisted_5, [
            (_ctx.starredCount>0)
              ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                  _createElementVNode("span", _hoisted_6, _toDisplayString(_ctx.starBarText), 1 /* TEXT */),
                  _createElementVNode("button", {
                    type: "button",
                    class: "gallery-marks-toggle",
                    onClick: _cache[1] || (_cache[1] = (...args) => (_ctx.toggleStarredOnly && _ctx.toggleStarredOnly(...args)))
                  }, _toDisplayString(_ctx.starredOnly ? _ctx.L.starAll : _ctx.L.starOnly), 1 /* TEXT */)
                ], 64 /* STABLE_FRAGMENT */))
              : _createCommentVNode("v-if", true),
            (_ctx.foldedN>0 && !_ctx.starredOnly)
              ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                  _createElementVNode("span", _hoisted_7, _toDisplayString(_ctx.foldBarText), 1 /* TEXT */),
                  _createElementVNode("button", {
                    type: "button",
                    class: "gallery-marks-toggle",
                    onClick: _cache[2] || (_cache[2] = (...args) => (_ctx.toggleExpandAll && _ctx.toggleExpandAll(...args)))
                  }, _toDisplayString(_ctx.expandAll ? _ctx.L.collapseAll : _ctx.L.expandAll), 1 /* TEXT */)
                ], 64 /* STABLE_FRAGMENT */))
              : _createCommentVNode("v-if", true)
          ]))
        : _createCommentVNode("v-if", true),
      (_ctx.view!=='files' && !_ctx.loading && !_ctx.isEmpty)
        ? (_openBlock(), _createElementBlock("div", _hoisted_8, [
            _createElementVNode("button", {
              type: "button",
              class: "danger",
              onClick: _cache[3] || (_cache[3] = $event => (_ctx.emptyAside(_ctx.view)))
            }, _toDisplayString(_ctx.view==='trash' ? _ctx.L.emptyTrash : _ctx.L.emptyBackup), 1 /* TEXT */)
          ]))
        : _createCommentVNode("v-if", true),
      _withDirectives(_createElementVNode("div", {
        class: _normalizeClass(["gallery-grid", { tall: _ctx.tileTall, list: _ctx.layout==='list' }]),
        style: _normalizeStyle(_ctx.tileStyle)
      }, [
        (_ctx.loading)
          ? (_openBlock(), _createElementBlock("div", _hoisted_9, [
              (!_ctx.stalled)
                ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                    _createTextVNode(_toDisplayString(_ctx.L.loading), 1 /* TEXT */)
                  ], 64 /* STABLE_FRAGMENT */))
                : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                    _createElementVNode("div", _hoisted_10, _toDisplayString(_ctx.stalled), 1 /* TEXT */),
                    _createElementVNode("div", _hoisted_11, [
                      _createElementVNode("button", {
                        type: "button",
                        class: "sheet-action ghost gallery-retry-btn",
                        onClick: _cache[4] || (_cache[4] = (...args) => (_ctx.retry && _ctx.retry(...args)))
                      }, _toDisplayString(_ctx.L.retry), 1 /* TEXT */),
                      _createElementVNode("button", {
                        type: "button",
                        class: "sheet-action ghost",
                        onClick: _cache[5] || (_cache[5] = (...args) => (_ctx.openDiag && _ctx.openDiag(...args)))
                      }, _toDisplayString(_ctx.L.openDiag), 1 /* TEXT */),
                      _createElementVNode("button", {
                        type: "button",
                        class: "sheet-action ghost",
                        onClick: _cache[6] || (_cache[6] = (...args) => (_ctx.reloadApp && _ctx.reloadApp(...args)))
                      }, _toDisplayString(_ctx.L.reload), 1 /* TEXT */)
                    ])
                  ], 64 /* STABLE_FRAGMENT */))
            ]))
          : _createCommentVNode("v-if", true),
        (_ctx.view==='files' && !_ctx.loading)
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.shownTimeline, (row) => {
                return (_openBlock(), _createElementBlock(_Fragment, {
                  key: row.key
                }, [
                  (row.ft)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 0,
                        class: "gallery-tile folder",
                        onClick: $event => (_ctx.enterFolder(row.ft.path))
                      }, [
                        _createElementVNode("div", {
                          class: "gallery-tile-thumb",
                          innerHTML: _ctx.ICON.folder
                        }, null, 8 /* PROPS */, _hoisted_13),
                        _createElementVNode("div", _hoisted_14, [
                          _createElementVNode("div", {
                            class: "gallery-tile-name",
                            title: row.ft.path
                          }, _toDisplayString(row.ft.name), 9 /* TEXT, PROPS */, _hoisted_15),
                          _createElementVNode("div", _hoisted_16, _toDisplayString(_ctx.L.folder), 1 /* TEXT */)
                        ]),
                        _createElementVNode("button", {
                          type: "button",
                          class: "gallery-tile-menu-btn",
                          "aria-label": _ctx.L.more,
                          onClick: _withModifiers($event => (_ctx.toggleMenu(row.key, $event)), ["stop"])
                        }, [...(_cache[13] || (_cache[13] = [
                          _createElementVNode("svg", {
                            viewBox: "0 0 24 24",
                            "aria-hidden": "true"
                          }, [
                            _createElementVNode("use", { href: "#more" })
                          ], -1 /* CACHED */)
                        ]))], 8 /* PROPS */, _hoisted_17),
                        (_openBlock(), _createBlock(_Teleport, { to: _ctx.menuMount }, [
                          _createElementVNode("div", {
                            class: "gallery-tile-menu-popup hidden",
                            "data-menu": row.key,
                            onClick: _cache[7] || (_cache[7] = _withModifiers(() => {}, ["stop"]))
                          }, [
                            _createElementVNode("button", {
                              type: "button",
                              class: "danger",
                              onClick: $event => (_ctx.folderDelete(row.ft))
                            }, [
                              _cache[14] || (_cache[14] = _createElementVNode("svg", {
                                viewBox: "0 0 24 24",
                                "aria-hidden": "true"
                              }, [
                                _createElementVNode("use", { href: "#trash-can" })
                              ], -1 /* CACHED */)),
                              _createElementVNode("span", null, _toDisplayString(_ctx.L.delEmptyFolder), 1 /* TEXT */)
                            ], 8 /* PROPS */, _hoisted_19)
                          ], 8 /* PROPS */, _hoisted_18)
                        ], 8 /* PROPS */, ["to"]))
                      ], 8 /* PROPS */, _hoisted_12))
                    : (row.strip)
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 1,
                          type: "button",
                          class: _normalizeClass(["gallery-fold-strip", { open: row.strip.open }]),
                          onClick: $event => (_ctx.toggleFold(row.key))
                        }, [
                          _createElementVNode("span", {
                            class: "gallery-fold-strip-ico",
                            innerHTML: _ctx.ICON.fold
                          }, null, 8 /* PROPS */, _hoisted_21),
                          _createElementVNode("span", null, _toDisplayString(row.strip.label), 1 /* TEXT */)
                        ], 10 /* CLASS, PROPS */, _hoisted_20))
                      : (_openBlock(), _createElementBlock("div", {
                          key: 2,
                          class: _normalizeClass(["gallery-tile", { active: row.t.isActive, encrypted: row.t.encrypted, attention: row.t.attention, starred: row.t.starred, dim: row.dim }]),
                          onClick: $event => (_ctx.openTile(row.item))
                        }, [
                          _createVNode(_component_ThumbCell, {
                            "enc-name": row.encLocal && row.thumb ? row.t.identifier : null,
                            fetchable: !row.encLocal && (row.t.hasCloud || row.t.hasLocal) && row.thumb,
                            sealed: row.t.encrypted,
                            "is-cloud": !row.t.hasLocal && row.t.hasCloud,
                            "cloud-newer": row.t.cloudNewer,
                            "thumb-token": String(row.t.time || row.t.size || 0),
                            fallback: row.t.stem.slice(0,1) || '?',
                            "fallback-html": _ctx.phHtml(row.t.identifier, row.info),
                            alt: row.t.identifier,
                            onUnlock: _ctx.onUnlock,
                            onSealed: $event => (_ctx.notePeekSealed(row.item))
                          }, null, 8 /* PROPS */, ["enc-name", "fetchable", "sealed", "is-cloud", "cloud-newer", "thumb-token", "fallback", "fallback-html", "alt", "onUnlock", "onSealed"]),
                          (row.ov)
                            ? (_openBlock(), _createElementBlock("span", {
                                key: 0,
                                class: "gallery-tile-overlay",
                                innerHTML: row.ov
                              }, null, 8 /* PROPS */, _hoisted_23))
                            : _createCommentVNode("v-if", true),
                          (row.act)
                            ? (_openBlock(), _createElementBlock("span", _hoisted_24, [
                                _createElementVNode("button", {
                                  type: "button",
                                  class: _normalizeClass(["gallery-tile-action", [row.act.state || 'ready', row.act.verb ? 'verb-' + row.act.verb : '']]),
                                  title: row.act.title,
                                  "aria-label": row.act.title,
                                  onClick: _withModifiers($event => (_ctx.tileAction(row)), ["stop"]),
                                  onPointerdown: _cache[8] || (_cache[8] = _withModifiers(() => {}, ["stop"]))
                                }, [
                                  _createElementVNode("span", {
                                    class: "gallery-tile-action-ico",
                                    innerHTML: _ctx.badgeIcon2(row.act.icon)
                                  }, null, 8 /* PROPS */, _hoisted_26),
                                  (row.act.verb)
                                    ? (_openBlock(), _createElementBlock("span", _hoisted_27, _toDisplayString(row.act.title), 1 /* TEXT */))
                                    : _createCommentVNode("v-if", true)
                                ], 42 /* CLASS, PROPS, NEED_HYDRATION */, _hoisted_25)
                              ]))
                            : _createCommentVNode("v-if", true),
                          (row.t.encrypted)
                            ? (_openBlock(), _createElementBlock("span", {
                                key: 2,
                                class: "gallery-tile-lockmark",
                                title: _ctx.L.encrypted,
                                innerHTML: _ctx.ICON.lock
                              }, null, 8 /* PROPS */, _hoisted_28))
                            : _createCommentVNode("v-if", true),
                          (row.nVersions)
                            ? (_openBlock(), _createElementBlock("span", _hoisted_29, [
                                _createElementVNode("button", {
                                  type: "button",
                                  class: _normalizeClass(["gallery-tile-versions", { open: row.versionsOpen }]),
                                  title: _ctx.versionsTitle(row.nVersions),
                                  "aria-label": _ctx.versionsTitle(row.nVersions),
                                  onClick: _withModifiers($event => (_ctx.toggleFold(row.vKey)), ["stop"]),
                                  onPointerdown: _cache[9] || (_cache[9] = _withModifiers(() => {}, ["stop"]))
                                }, "+" + _toDisplayString(row.nVersions), 43 /* TEXT, CLASS, PROPS, NEED_HYDRATION */, _hoisted_30)
                              ]))
                            : _createCommentVNode("v-if", true),
                          _createElementVNode("div", _hoisted_31, [
                            (row.t.isActive)
                              ? (_openBlock(), _createElementBlock("span", _hoisted_32, _toDisplayString(_ctx.L.activeTag), 1 /* TEXT */))
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
                                  }, null, 8 /* PROPS */, _hoisted_34))
                                : _createCommentVNode("v-if", true),
                              (row.t.starred)
                                ? (_openBlock(), _createElementBlock("span", {
                                    key: 1,
                                    class: "gallery-tile-star",
                                    title: _ctx.L.starredMark,
                                    innerHTML: _ctx.ICON.star
                                  }, null, 8 /* PROPS */, _hoisted_35))
                                : _createCommentVNode("v-if", true),
                              _createTextVNode(_toDisplayString(row.t.stem), 1 /* TEXT */)
                            ], 8 /* PROPS */, _hoisted_33),
                            (row.sub)
                              ? (_openBlock(), _createElementBlock("div", {
                                  key: 1,
                                  class: "gallery-tile-sub",
                                  title: row.sub
                                }, _toDisplayString(row.sub), 9 /* TEXT, PROPS */, _hoisted_36))
                              : _createCommentVNode("v-if", true),
                            _createElementVNode("div", _hoisted_37, [
                              (row.t.encrypted)
                                ? (_openBlock(), _createElementBlock("span", {
                                    key: 0,
                                    class: "gallery-tile-state-icon enc",
                                    title: _ctx.L.encrypted,
                                    innerHTML: _ctx.ICON.lock
                                  }, null, 8 /* PROPS */, _hoisted_38))
                                : _createCommentVNode("v-if", true),
                              (row.t.unlocked)
                                ? (_openBlock(), _createElementBlock("span", {
                                    key: 1,
                                    class: "gallery-tile-state-icon editing",
                                    title: _ctx.L.unlockedMark,
                                    innerHTML: _ctx.ICON.pencil
                                  }, null, 8 /* PROPS */, _hoisted_39))
                                : _createCommentVNode("v-if", true),
                              _createElementVNode("span", {
                                class: _normalizeClass('gallery-tile-state-icon b-' + row.t.badge),
                                title: row.t.badgeTitle,
                                innerHTML: _ctx.badgeIcon(row.t.badge)
                              }, null, 10 /* CLASS, PROPS */, _hoisted_40),
                              _createElementVNode("span", null, _toDisplayString(_ctx.fmtMeta(row.t)), 1 /* TEXT */)
                            ])
                          ]),
                          _createElementVNode("button", {
                            type: "button",
                            class: "gallery-tile-menu-btn",
                            "aria-label": _ctx.L.more,
                            onClick: _withModifiers($event => (_ctx.toggleMenu(row.t.identifier, $event)), ["stop"])
                          }, [...(_cache[15] || (_cache[15] = [
                            _createElementVNode("svg", {
                              viewBox: "0 0 24 24",
                              "aria-hidden": "true"
                            }, [
                              _createElementVNode("use", { href: "#more" })
                            ], -1 /* CACHED */)
                          ]))], 8 /* PROPS */, _hoisted_41),
                          (_openBlock(), _createBlock(_Teleport, { to: _ctx.menuMount }, [
                            _createElementVNode("div", {
                              class: "gallery-tile-menu-popup hidden",
                              "data-menu": row.t.identifier,
                              onClick: _cache[10] || (_cache[10] = _withModifiers(() => {}, ["stop"]))
                            }, [
                              (row.t.ghost)
                                ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                    _createElementVNode("div", _hoisted_43, _toDisplayString(_ctx.L.divergedNote), 1 /* TEXT */),
                                    _createElementVNode("button", {
                                      type: "button",
                                      onClick: $event => (_ctx.resolve(row.item))
                                    }, [
                                      _cache[16] || (_cache[16] = _createElementVNode("svg", {
                                        viewBox: "0 0 24 24",
                                        "aria-hidden": "true"
                                      }, [
                                        _createElementVNode("use", { href: "#cloud-pending" })
                                      ], -1 /* CACHED */)),
                                      _createElementVNode("span", null, _toDisplayString(_ctx.L.resolve), 1 /* TEXT */)
                                    ], 8 /* PROPS */, _hoisted_44),
                                    _createElementVNode("button", {
                                      type: "button",
                                      onClick: $event => (_ctx.rename(row.item))
                                    }, [
                                      _cache[17] || (_cache[17] = _createElementVNode("svg", {
                                        viewBox: "0 0 24 24",
                                        "aria-hidden": "true"
                                      }, [
                                        _createElementVNode("use", { href: "#rename" })
                                      ], -1 /* CACHED */)),
                                      _createElementVNode("span", null, _toDisplayString(_ctx.L.renameKeep), 1 /* TEXT */)
                                    ], 8 /* PROPS */, _hoisted_45)
                                  ], 64 /* STABLE_FRAGMENT */))
                                : (row.t.pendingGone)
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 1,
                                      type: "button",
                                      onClick: $event => (_ctx.resolve(row.item))
                                    }, [
                                      _cache[18] || (_cache[18] = _createElementVNode("svg", {
                                        viewBox: "0 0 24 24",
                                        "aria-hidden": "true"
                                      }, [
                                        _createElementVNode("use", { href: "#cloud-pending" })
                                      ], -1 /* CACHED */)),
                                      _createElementVNode("span", null, _toDisplayString(_ctx.L.resolve), 1 /* TEXT */)
                                    ], 8 /* PROPS */, _hoisted_46))
                                  : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                                      _createElementVNode("button", {
                                        type: "button",
                                        onClick: $event => (_ctx.rename(row.item))
                                      }, [
                                        _cache[19] || (_cache[19] = _createElementVNode("svg", {
                                          viewBox: "0 0 24 24",
                                          "aria-hidden": "true"
                                        }, [
                                          _createElementVNode("use", { href: "#rename" })
                                        ], -1 /* CACHED */)),
                                        _createElementVNode("span", null, _toDisplayString(_ctx.L.rename), 1 /* TEXT */)
                                      ], 8 /* PROPS */, _hoisted_47),
                                      _createElementVNode("button", {
                                        type: "button",
                                        onClick: $event => (_ctx.move(row.item))
                                      }, [
                                        _cache[20] || (_cache[20] = _createElementVNode("svg", {
                                          viewBox: "0 0 24 24",
                                          "aria-hidden": "true"
                                        }, [
                                          _createElementVNode("use", { href: "#move-to-folder" })
                                        ], -1 /* CACHED */)),
                                        _createElementVNode("span", null, _toDisplayString(_ctx.L.moveTo), 1 /* TEXT */)
                                      ], 8 /* PROPS */, _hoisted_48),
                                      _createElementVNode("button", {
                                        type: "button",
                                        onClick: $event => (_ctx.copy(row.item))
                                      }, [
                                        _cache[21] || (_cache[21] = _createElementVNode("svg", {
                                          viewBox: "0 0 24 24",
                                          "aria-hidden": "true"
                                        }, [
                                          _createElementVNode("use", { href: "#copy" })
                                        ], -1 /* CACHED */)),
                                        _createElementVNode("span", null, _toDisplayString(_ctx.L.copy), 1 /* TEXT */)
                                      ], 8 /* PROPS */, _hoisted_49),
                                      (row.t.lockable && !row.t.unlocked)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 0,
                                            type: "button",
                                            onClick: $event => (_ctx.unlockAndOpen(row.item))
                                          }, [
                                            _cache[22] || (_cache[22] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#pencil" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.editContinue), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_50))
                                        : _createCommentVNode("v-if", true),
                                      (row.t.lockable && !row.t.unlocked)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 1,
                                            type: "button",
                                            onClick: $event => (_ctx.versionThenEdit(row.item))
                                          }, [
                                            _cache[23] || (_cache[23] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#layers-stack" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.editVersionThen), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_51))
                                        : _createCommentVNode("v-if", true),
                                      (row.t.unlocked)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 2,
                                            type: "button",
                                            onClick: $event => (_ctx.lockEdit(row.item))
                                          }, [
                                            _cache[24] || (_cache[24] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#lock" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.editLock), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_52))
                                        : _createCommentVNode("v-if", true),
                                      _createElementVNode("button", {
                                        type: "button",
                                        onClick: $event => (_ctx.saveVersion(row.item))
                                      }, [
                                        _cache[25] || (_cache[25] = _createElementVNode("svg", {
                                          viewBox: "0 0 24 24",
                                          "aria-hidden": "true"
                                        }, [
                                          _createElementVNode("use", { href: "#layers-stack" })
                                        ], -1 /* CACHED */)),
                                        _createElementVNode("span", null, _toDisplayString(_ctx.L.saveVersion), 1 /* TEXT */)
                                      ], 8 /* PROPS */, _hoisted_53),
                                      (row.hasPrevVersion)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 3,
                                            type: "button",
                                            onClick: $event => (_ctx.saveVersionReplace(row.item))
                                          }, [
                                            _cache[26] || (_cache[26] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#layers-stack" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.saveVersionReplace), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_54))
                                        : _createCommentVNode("v-if", true),
                                      (_ctx.caps.marks && !row.t.starred)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 4,
                                            type: "button",
                                            onClick: $event => (_ctx.star(row.item))
                                          }, [
                                            _cache[27] || (_cache[27] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#star" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.star), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_55))
                                        : _createCommentVNode("v-if", true),
                                      (_ctx.caps.marks && row.t.starred)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 5,
                                            type: "button",
                                            onClick: $event => (_ctx.unstar(row.item))
                                          }, [
                                            _cache[28] || (_cache[28] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#star" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.unstar), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_56))
                                        : _createCommentVNode("v-if", true),
                                      (_ctx.caps.marks && !row.t.folded && !row.isVersion)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 6,
                                            type: "button",
                                            onClick: $event => (_ctx.fold(row.item))
                                          }, [
                                            _cache[29] || (_cache[29] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#archive-box" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.fold), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_57))
                                        : _createCommentVNode("v-if", true),
                                      (_ctx.caps.marks && row.t.folded)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 7,
                                            type: "button",
                                            onClick: $event => (_ctx.unfold(row.item))
                                          }, [
                                            _cache[30] || (_cache[30] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#archive-box" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.unfold), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_58))
                                        : _createCommentVNode("v-if", true),
                                      (row.t.badge==='cloudOnly')
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 8,
                                            type: "button",
                                            onClick: $event => (_ctx.openTile(row.item))
                                          }, [
                                            _cache[31] || (_cache[31] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#download" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.pullLocal), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_59))
                                        : _createCommentVNode("v-if", true),
                                      (row.t.badge==='cloudOnly')
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 9,
                                            type: "button",
                                            onClick: $event => (_ctx.keepOffline(row.item))
                                          }, [
                                            _cache[32] || (_cache[32] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#local-cache" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.keepOffline), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_60))
                                        : _createCommentVNode("v-if", true),
                                      (row.t.badge==='localOnly' || row.t.badge==='float' || row.t.badge==='dirtyBoth' || row.t.badge==='conflictBoth')
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 10,
                                            type: "button",
                                            onClick: $event => (_ctx.resolve(row.item))
                                          }, [
                                            _cache[33] || (_cache[33] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#cloud-pending" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.resolve), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_61))
                                        : _createCommentVNode("v-if", true),
                                      (row.t.hasLocal && row.t.hasCloud)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 11,
                                            type: "button",
                                            onClick: $event => (_ctx.unload(row.item))
                                          }, [
                                            _cache[34] || (_cache[34] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#unload-local-cache" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.unloadLocal), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_62))
                                        : _createCommentVNode("v-if", true),
                                      (row.encMenu.encrypt)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 12,
                                            type: "button",
                                            onClick: $event => (_ctx.encryptItem(row.item))
                                          }, [
                                            _cache[35] || (_cache[35] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#lock" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.encrypt), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_63))
                                        : _createCommentVNode("v-if", true),
                                      (row.encMenu.decrypt)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 13,
                                            type: "button",
                                            onClick: $event => (_ctx.decryptItem(row.item))
                                          }, [
                                            _cache[36] || (_cache[36] = _createElementVNode("svg", {
                                              viewBox: "0 0 24 24",
                                              "aria-hidden": "true"
                                            }, [
                                              _createElementVNode("use", { href: "#unlock" })
                                            ], -1 /* CACHED */)),
                                            _createElementVNode("span", null, _toDisplayString(_ctx.L.decrypt), 1 /* TEXT */)
                                          ], 8 /* PROPS */, _hoisted_64))
                                        : _createCommentVNode("v-if", true),
                                      _createElementVNode("button", {
                                        type: "button",
                                        class: "danger",
                                        onClick: $event => (_ctx.del(row.item))
                                      }, [
                                        _cache[37] || (_cache[37] = _createElementVNode("svg", {
                                          viewBox: "0 0 24 24",
                                          "aria-hidden": "true"
                                        }, [
                                          _createElementVNode("use", { href: "#trash-can" })
                                        ], -1 /* CACHED */)),
                                        _createElementVNode("span", null, _toDisplayString(_ctx.L.toTrash), 1 /* TEXT */)
                                      ], 8 /* PROPS */, _hoisted_65)
                                    ], 64 /* STABLE_FRAGMENT */))
                            ], 8 /* PROPS */, _hoisted_42)
                          ], 8 /* PROPS */, ["to"]))
                        ], 10 /* CLASS, PROPS */, _hoisted_22))
                ], 64 /* STABLE_FRAGMENT */))
              }), 128 /* KEYED_FRAGMENT */)),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList((_ctx.attentionOnly ? [] : _ctx.imageTiles), (im) => {
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
                  _createElementVNode("div", _hoisted_67, [
                    _createElementVNode("div", {
                      class: "gallery-tile-name",
                      title: im.identifier
                    }, _toDisplayString(im.label), 9 /* TEXT, PROPS */, _hoisted_68),
                    _createElementVNode("div", _hoisted_69, [
                      _createElementVNode("span", {
                        class: "gallery-tile-state-icon",
                        title: _ctx.L.imageFile,
                        innerHTML: _ctx.ICON.image
                      }, null, 8 /* PROPS */, _hoisted_70),
                      _createElementVNode("span", null, _toDisplayString(_ctx.fmtMeta({ time: im.time, size: im.size })), 1 /* TEXT */)
                    ])
                  ]),
                  _createElementVNode("button", {
                    type: "button",
                    class: "gallery-tile-menu-btn",
                    "aria-label": _ctx.L.more,
                    onClick: _withModifiers($event => (_ctx.toggleMenu('I:'+im.identifier, $event)), ["stop"])
                  }, [...(_cache[38] || (_cache[38] = [
                    _createElementVNode("svg", {
                      viewBox: "0 0 24 24",
                      "aria-hidden": "true"
                    }, [
                      _createElementVNode("use", { href: "#more" })
                    ], -1 /* CACHED */)
                  ]))], 8 /* PROPS */, _hoisted_71),
                  (_openBlock(), _createBlock(_Teleport, { to: _ctx.menuMount }, [
                    _createElementVNode("div", {
                      class: "gallery-tile-menu-popup hidden",
                      "data-menu": 'I:'+im.identifier,
                      onClick: _cache[11] || (_cache[11] = _withModifiers(() => {}, ["stop"]))
                    }, [
                      _createElementVNode("button", {
                        type: "button",
                        class: "danger",
                        onClick: $event => (_ctx.deleteImage(im.raw))
                      }, [
                        _cache[39] || (_cache[39] = _createElementVNode("svg", {
                          viewBox: "0 0 24 24",
                          "aria-hidden": "true"
                        }, [
                          _createElementVNode("use", { href: "#trash-can" })
                        ], -1 /* CACHED */)),
                        _createElementVNode("span", null, _toDisplayString(_ctx.L.toTrash), 1 /* TEXT */)
                      ], 8 /* PROPS */, _hoisted_73)
                    ], 8 /* PROPS */, _hoisted_72)
                  ], 8 /* PROPS */, ["to"]))
                ], 8 /* PROPS */, _hoisted_66))
              }), 128 /* KEYED_FRAGMENT */)),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList((_ctx.attentionOnly ? [] : _ctx.otherTiles), (ot) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: 'O:'+ot.identifier,
                  class: "gallery-tile other-file"
                }, [
                  _createElementVNode("div", {
                    class: "gallery-tile-thumb",
                    innerHTML: _ctx.ICON.file
                  }, null, 8 /* PROPS */, _hoisted_74),
                  _createElementVNode("div", _hoisted_75, [
                    _createElementVNode("div", {
                      class: "gallery-tile-name",
                      title: ot.identifier
                    }, _toDisplayString(ot.label), 9 /* TEXT, PROPS */, _hoisted_76),
                    _createElementVNode("div", _hoisted_77, [
                      _createElementVNode("span", {
                        class: "gallery-tile-state-icon",
                        title: _ctx.L.otherFile,
                        innerHTML: _ctx.ICON.file
                      }, null, 8 /* PROPS */, _hoisted_78),
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
                  sealed: row.item.encrypted,
                  "is-cloud": row.fetch && row.item.side==='cloud',
                  "thumb-token": "0",
                  fallback: row.t.stem.slice(0,1) || '?',
                  "fallback-html": row.item.kind != null ? _ctx.phHtml(row.t.identifier, row.info) : '',
                  alt: row.t.identifier
                }, null, 8 /* PROPS */, ["fetchable", "sealed", "is-cloud", "fallback", "fallback-html", "alt"]),
                (row.ov)
                  ? (_openBlock(), _createElementBlock("span", {
                      key: 0,
                      class: "gallery-tile-overlay",
                      innerHTML: row.ov
                    }, null, 8 /* PROPS */, _hoisted_79))
                  : _createCommentVNode("v-if", true),
                (row.item.encrypted)
                  ? (_openBlock(), _createElementBlock("span", {
                      key: 1,
                      class: "gallery-tile-lockmark",
                      title: _ctx.L.encrypted,
                      innerHTML: _ctx.ICON.lock
                    }, null, 8 /* PROPS */, _hoisted_80))
                  : _createCommentVNode("v-if", true),
                _createElementVNode("div", _hoisted_81, [
                  _createElementVNode("div", {
                    class: "gallery-tile-name",
                    title: row.t.identifier
                  }, _toDisplayString(row.t.stem), 9 /* TEXT, PROPS */, _hoisted_82),
                  _createElementVNode("div", {
                    class: "gallery-tile-meta",
                    title: _ctx.fullTime(row.t.at)
                  }, _toDisplayString(row.t.source) + " · " + _toDisplayString(_ctx.humanTime(row.t.at)) + " " + _toDisplayString(row.atWord), 9 /* TEXT, PROPS */, _hoisted_83)
                ]),
                _createElementVNode("button", {
                  type: "button",
                  class: "gallery-tile-menu-btn",
                  "aria-label": _ctx.L.more,
                  onClick: _withModifiers($event => (_ctx.toggleMenu('A:'+row.t.key, $event)), ["stop"])
                }, [...(_cache[40] || (_cache[40] = [
                  _createElementVNode("svg", {
                    viewBox: "0 0 24 24",
                    "aria-hidden": "true"
                  }, [
                    _createElementVNode("use", { href: "#more" })
                  ], -1 /* CACHED */)
                ]))], 8 /* PROPS */, _hoisted_84),
                (_openBlock(), _createBlock(_Teleport, { to: _ctx.menuMount }, [
                  _createElementVNode("div", {
                    class: "gallery-tile-menu-popup hidden",
                    "data-menu": 'A:'+row.t.key,
                    onClick: _cache[12] || (_cache[12] = _withModifiers(() => {}, ["stop"]))
                  }, [
                    _createElementVNode("button", {
                      type: "button",
                      onClick: $event => (_ctx.asideRestore(row.item))
                    }, [
                      _cache[41] || (_cache[41] = _createElementVNode("svg", {
                        viewBox: "0 0 24 24",
                        "aria-hidden": "true"
                      }, [
                        _createElementVNode("use", { href: "#restore-trash" })
                      ], -1 /* CACHED */)),
                      _createElementVNode("span", null, _toDisplayString(_ctx.L.restore), 1 /* TEXT */)
                    ], 8 /* PROPS */, _hoisted_86),
                    _createElementVNode("button", {
                      type: "button",
                      class: "danger",
                      onClick: $event => (_ctx.asidePurge(row.item))
                    }, [
                      _cache[42] || (_cache[42] = _createElementVNode("svg", {
                        viewBox: "0 0 24 24",
                        "aria-hidden": "true"
                      }, [
                        _createElementVNode("use", { href: "#trash-can" })
                      ], -1 /* CACHED */)),
                      _createElementVNode("span", null, _toDisplayString(_ctx.L.purge), 1 /* TEXT */)
                    ], 8 /* PROPS */, _hoisted_87)
                  ], 8 /* PROPS */, _hoisted_85)
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
