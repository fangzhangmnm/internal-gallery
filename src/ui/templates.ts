// 图库的三张 Vue 模板（0.8.4 自 gallery-screen.ts 原样搬出，内容零改动）。created 2026-10-17 by Claude Opus 5.5
// 改这里 = 跑 `npm run build`（scripts/compile-templates.mjs 会重生 templates.compiled.ts；test/templates-compiled 守着两边一致）。
// 只许是常量字符串：不许拼接任何运行时的值（编译在构建时发生，拼进来的东西不会生效；更不许把用户内容拼进模板 = 模板注入）。

export const THUMB_CELL_TEMPLATE = `
    <img v-if="url" class="gallery-tile-thumb" :class="{ pixelated }" :src="url" :alt="alt" :title="blurb || null" loading="lazy" @load="onThumbLoad" />
    <div v-else-if="locked" class="gallery-tile-thumb placeholder locked" :title="lockedTitle" @click.stop="$emit('unlock', encName || alt)">
      <span style="width:42px;height:42px;display:inline-block" v-html="ICON.lock"></span>
    </div>
    <div v-else class="gallery-tile-thumb placeholder" ref="root">
      <span v-if="showCloud" style="width:48px;height:48px;display:inline-block" v-html="ICON.cloudBig"></span>
      <span v-else-if="fallbackHtml" class="gallery-tile-ph-icon" v-html="fallbackHtml"></span>
      <template v-else>{{ fallback }}</template>
    </div>`;

export const IMAGE_THUMB_CELL_TEMPLATE = `
    <img v-if="url" class="gallery-tile-thumb" :class="{ pixelated }" :src="url" :alt="alt" loading="lazy" @load="onThumbLoad" />
    <div v-else class="gallery-tile-thumb placeholder" ref="root">{{ fallback }}</div>`;

// 模板逐字自 WeebPaint gallery.ts v0.14.9（class 名不变，宿主 CSS 直接生效）；唯一增补：加密菜单项加 v-if="hasEncryption"。
export const GALLERY_TEMPLATE = `
      <div class="gallery-breadcrumb" :class="{ hidden: !folder }" v-if="view==='files'">
        <template v-for="(c,i) in crumbs" :key="c.path">
          <span v-if="i>0" class="sep">›</span>
          <button type="button" :class="{ current: c.current }" @click="!c.current && setFolder(c.path)">{{ c.label }}</button>
        </template>
      </div>

      <!-- 0.8.8：有没同步好的 → 顶上一条横幅「有 N 份要处理 → 看列表」；点了只看那几张（每张右下角一粒可见的「处理…」钮）。复用面包屑容器样式。 -->
      <div class="gallery-breadcrumb gallery-attention-bar" v-if="view==='files' && !loading && attentionCount>0">
        <span class="gallery-attention-text">{{ attentionText }}</span>
        <button type="button" class="gallery-attention-toggle" @click="toggleAttentionOnly">{{ attentionOnly ? L.attentionAll : L.attentionList }}</button>
      </div>

      <!-- 0.8.6：回收站 / 备份箱视图顶上一条动作（store files.emptyTrash / emptyBackup 一直有、图库从没给过入口——store README「暂无 gallery UI」）。复用面包屑的容器与按钮样式，宿主零 CSS。 -->
      <div class="gallery-breadcrumb gallery-aside-bar" v-if="view!=='files' && !loading && !isEmpty">
        <button type="button" class="danger" @click="emptyAside(view)">{{ view==='trash' ? L.emptyTrash : L.emptyBackup }}</button>
      </div>

      <div class="gallery-grid" :class="{ tall: tileTall, list: layout==='list' }" :style="tileStyle" v-show="!isEmpty || loading">
        <div v-if="loading" class="gallery-loading">
          <template v-if="!stalled">{{ L.loading }}</template>
          <template v-else>
            <div class="gallery-stalled">{{ stalled }}</div>
            <div class="gallery-stalled-actions">
              <button type="button" class="sheet-action ghost gallery-retry-btn" @click="retry">{{ L.retry }}</button>
              <button type="button" class="sheet-action ghost" @click="openDiag">{{ L.openDiag }}</button>
              <button type="button" class="sheet-action ghost" @click="reloadApp">{{ L.reload }}</button>
            </div>
          </template>
        </div>

        <template v-if="view==='files' && !loading">
          <div v-for="ft in (attentionOnly ? [] : folderTiles)" :key="'F:'+ft.path" class="gallery-tile folder" @click="enterFolder(ft.path)">
            <div class="gallery-tile-thumb" v-html="ICON.folder"></div>
            <div class="gallery-tile-name-row">
              <div class="gallery-tile-name" :title="ft.path">{{ ft.name }}</div>
              <div class="gallery-tile-meta">{{ L.folder }}</div>
            </div>
            <button type="button" class="gallery-tile-menu-btn" :aria-label="L.more" @click.stop="toggleMenu('F:'+ft.path, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#more"/></svg></button>
            <Teleport :to="menuMount"><div class="gallery-tile-menu-popup hidden" :data-menu="'F:'+ft.path" @click.stop>
              <button type="button" class="danger" @click="folderDelete(ft)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#trash-can"/></svg><span>{{ L.delEmptyFolder }}</span></button>
            </div></Teleport>
          </div>

          <div v-for="row in shownFileTiles" :key="row.t.identifier" class="gallery-tile" :class="{ active: row.t.isActive, encrypted: row.t.encrypted, attention: row.t.attention }" @click="openTile(row.item)">
            <ThumbCell :enc-name="row.t.encrypted && row.thumb ? row.t.identifier : null" :fetchable="!row.t.encrypted && (row.t.hasCloud || row.t.hasLocal) && row.thumb" :is-cloud="!row.t.hasLocal && row.t.hasCloud" :cloud-newer="row.t.cloudNewer" :thumb-token="String(row.t.time || row.t.size || 0)" :fallback="row.t.stem.slice(0,1) || '?'" :fallback-html="phHtml(row.t.identifier, row.info)" :alt="row.t.identifier" @unlock="onUnlock" />
            <span v-if="row.ov" class="gallery-tile-overlay" v-html="row.ov"></span>
            <span v-if="row.act" class="gallery-tile-action-slot"><button type="button" class="gallery-tile-action" :class="[row.act.state || 'ready', row.act.verb ? 'verb-' + row.act.verb : '']" :title="row.act.title" :aria-label="row.act.title" @click.stop="tileAction(row)" @pointerdown.stop><span class="gallery-tile-action-ico" v-html="badgeIcon2(row.act.icon)"></span><span v-if="row.act.verb" class="gallery-tile-action-label">{{ row.act.title }}</span></button></span>
            <span v-if="row.t.encrypted" class="gallery-tile-lockmark" :title="L.encrypted" v-html="ICON.lock"></span>
            <div class="gallery-tile-name-row">
              <span v-if="row.t.isActive" class="gallery-tile-active-tag">{{ L.activeTag }}</span>
              <div class="gallery-tile-name" :title="row.t.identifier"><span v-if="row.marker==='unread'" class="gallery-marker unread" :title="L.unread"></span>{{ row.t.stem }}</div>
              <div v-if="row.sub" class="gallery-tile-sub" :title="row.sub">{{ row.sub }}</div>
              <div class="gallery-tile-meta">
                <span v-if="row.t.encrypted" class="gallery-tile-state-icon enc" :title="L.encrypted" v-html="ICON.lock"></span>
                <span :class="'gallery-tile-state-icon b-' + row.t.badge" :title="row.t.badgeTitle" v-html="badgeIcon(row.t.badge)"></span>
                <span>{{ fmtMeta(row.t) }}</span>
              </div>
            </div>
            <button type="button" class="gallery-tile-menu-btn" :aria-label="L.more" @click.stop="toggleMenu(row.t.identifier, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#more"/></svg></button>
            <Teleport :to="menuMount"><div class="gallery-tile-menu-popup hidden" :data-menu="row.t.identifier" @click.stop>
              <template v-if="row.t.ghost">
                <!-- 0.8.6：云端没了 ∧ 这台有没传的改动——去掉「丢弃（送回收站）」那个面外的方向动词（user 2026-10-16「冲突只在库的面里三选一」）；
                     「处理…」= store file.resolve()：库弹面（本地覆盖云端 = 重推 / 云端覆盖本地 = 这份进回收站 / 取消）。「重命名留存」留着：不是同步动词，是改身份另存。 -->
                <div class="gallery-menu-note">{{ L.divergedNote }}</div>
                <button type="button" @click="resolve(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#cloud-pending"/></svg><span>{{ L.resolve }}</span></button>
                <button type="button" @click="rename(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#rename"/></svg><span>{{ L.renameKeep }}</span></button>
              </template>
              <template v-else-if="row.t.pendingGone">
                <!-- 0.8.3：没同步好的行只有「处理…」（库弹面三选一）。这里以前还放着「送到回收站」= 双向删除，和 KudsRocket 2026-10-14 00:54 丢存档同一个坑（user「冲突的时候不要放删除按钮」）；
                     「这份不要了」= 面里选云端覆盖本地，store 0.18.5 起干净副本也走这张面。 -->
                <button type="button" @click="resolve(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#cloud-pending"/></svg><span>{{ L.resolve }}</span></button>
              </template>
              <template v-else>
                <button type="button" @click="rename(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#rename"/></svg><span>{{ L.rename }}</span></button>
                <button type="button" @click="move(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#move-to-folder"/></svg><span>{{ L.moveTo }}</span></button>
                <button type="button" @click="copy(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#copy"/></svg><span>{{ L.copy }}</span></button>
                <button v-if="row.t.badge==='cloudOnly'" type="button" @click="openTile(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#download"/></svg><span>{{ L.pullLocal }}</span></button>
                <button v-if="row.t.badge==='cloudOnly'" type="button" @click="keepOffline(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#local-cache"/></svg><span>{{ L.keepOffline }}</span></button>
                <button v-if="row.t.badge==='localOnly' || row.t.badge==='float' || row.t.badge==='dirtyBoth' || row.t.badge==='conflictBoth'" type="button" @click="resolve(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#cloud-pending"/></svg><span>{{ L.resolve }}</span></button>
                <button v-if="row.t.hasLocal && row.t.hasCloud" type="button" @click="unload(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#unload-local-cache"/></svg><span>{{ L.unloadLocal }}</span></button>
                <button v-if="hasEncryption && row.t.hasLocal && !row.t.encrypted" type="button" @click="encryptItem(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#lock"/></svg><span>{{ L.encrypt }}</span></button>
                <button v-if="hasEncryption && row.t.hasLocal && row.t.encrypted" type="button" @click="decryptItem(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#unlock"/></svg><span>{{ L.decrypt }}</span></button>
                <button type="button" class="danger" @click="del(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#trash-can"/></svg><span>{{ L.toTrash }}</span></button>
              </template>
            </div></Teleport>
          </div>

          <div v-for="im in (attentionOnly ? [] : imageTiles)" :key="'I:'+im.identifier" class="gallery-tile image-file" @click="openImageTile(im.raw)">
            <ImageThumbCell :identifier="im.identifier" :token="im.token" :fallback="im.label.slice(0,1) || '?'" :alt="im.label" />
            <div class="gallery-tile-name-row">
              <div class="gallery-tile-name" :title="im.identifier">{{ im.label }}</div>
              <div class="gallery-tile-meta">
                <span class="gallery-tile-state-icon" :title="L.imageFile" v-html="ICON.image"></span>
                <span>{{ fmtMeta({ time: im.time, size: im.size }) }}</span>
              </div>
            </div>
            <button type="button" class="gallery-tile-menu-btn" :aria-label="L.more" @click.stop="toggleMenu('I:'+im.identifier, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#more"/></svg></button>
            <Teleport :to="menuMount"><div class="gallery-tile-menu-popup hidden" :data-menu="'I:'+im.identifier" @click.stop>
              <button type="button" class="danger" @click="deleteImage(im.raw)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#trash-can"/></svg><span>{{ L.toTrash }}</span></button>
            </div></Teleport>
          </div>
          <div v-for="ot in (attentionOnly ? [] : otherTiles)" :key="'O:'+ot.identifier" class="gallery-tile other-file">
            <div class="gallery-tile-thumb" v-html="ICON.file"></div>
            <div class="gallery-tile-name-row">
              <div class="gallery-tile-name" :title="ot.identifier">{{ ot.label }}</div>
              <div class="gallery-tile-meta">
                <span class="gallery-tile-state-icon" :title="L.otherFile" v-html="ICON.file"></span>
                <span>{{ fmtMeta({ time: ot.time, size: ot.size }) }}</span>
              </div>
            </div>
          </div>
        </template>

        <template v-if="view!=='files' && !loading">
          <div v-for="row in asideTiles" :key="row.t.key" class="gallery-tile aside" :class="['aside-' + row.item.box, { encrypted: row.item.encrypted }]">
            <ThumbCell :fetchable="row.fetch" :is-cloud="row.fetch && row.item.side==='cloud'" thumb-token="0" :fallback="row.t.stem.slice(0,1) || '?'" :fallback-html="row.item.kind != null ? phHtml(row.t.identifier, row.info) : ''" :alt="row.t.identifier" />
            <span v-if="row.ov" class="gallery-tile-overlay" v-html="row.ov"></span>
            <span v-if="row.item.encrypted" class="gallery-tile-lockmark" :title="L.encrypted" v-html="ICON.lock"></span>
            <div class="gallery-tile-name-row">
              <div class="gallery-tile-name" :title="row.t.identifier">{{ row.t.stem }}</div>
              <div class="gallery-tile-meta" :title="fullTime(row.t.at)">{{ row.t.source }} · {{ humanTime(row.t.at) }} {{ row.atWord }}</div>
            </div>
            <button type="button" class="gallery-tile-menu-btn" :aria-label="L.more" @click.stop="toggleMenu('A:'+row.t.key, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#more"/></svg></button>
            <Teleport :to="menuMount"><div class="gallery-tile-menu-popup hidden" :data-menu="'A:'+row.t.key" @click.stop>
              <button type="button" @click="asideRestore(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#restore-trash"/></svg><span>{{ L.restore }}</span></button>
              <button type="button" class="danger" @click="asidePurge(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#trash-can"/></svg><span>{{ L.purge }}</span></button>
            </div></Teleport>
          </div>
        </template>
      </div>

      <div class="gallery-empty" v-show="isEmpty && !loading">{{ emptyText }}</div>
`;
