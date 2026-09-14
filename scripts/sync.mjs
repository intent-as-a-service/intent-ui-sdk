#!/usr/bin/env node
/**
 * intent-ui-sdk · 宿主副本同步（本仓库是唯一真源）
 *
 * 后端要把 SDK 以静态资源形式对外提供（Spring 的 classpath:/intent-ui/**，
 * 或任意 Web 服务器的静态目录），因此每个宿主都会有一份"产物副本"。
 * 这份副本必须由本脚本生成，禁止手工编辑——否则就会出现"两个宿主各自漂移"。
 *
 * 用法：
 *   node scripts/sync.mjs                    # 同步到内置的默认宿主目录
 *   node scripts/sync.mjs --check            # 只校验不写入；有漂移则退出码 1（CI 用）
 *   node scripts/sync.mjs <dir> [<dir>...]   # 同步到指定目录
 */

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** 需要镜像到宿主的产物（相对本仓库根目录） */
const ARTIFACTS = [
  'package.json',
  'js/intent-ui-sdk.js',
  'js/intent-ui-sdk.mjs',
  'js/intent-ui-sdk.d.ts',
  'css/intent-ui.css',
];

/**
 * 默认宿主副本目录（相对本仓库根目录）。
 * 注意：宿主的 index.html、js/demo-app.js 属于宿主自持（代理前缀、演示数据各不相同），
 * 不在同步范围内，本脚本不会覆盖它们。
 */
const DEFAULT_TARGETS = [
  '../ruoyi/ruoyi-vue-plus/backend/ruoyi-common/ruoyi-common-intent/src/main/resources/intent-ui',
  '../ruoyi-office/ruoyi-office/yudao-module-intent/src/main/resources/intent-ui',
];

const argv = process.argv.slice(2);
const checkOnly = argv.includes('--check');
const cliTargets = argv.filter((a) => !a.startsWith('--'));
const targets = (cliTargets.length ? cliTargets : DEFAULT_TARGETS).map((t) => resolve(ROOT, t));

const hashOf = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

// 真源自身先做一次完整性检查，避免把缺文件的仓库同步出去
for (const rel of ARTIFACTS) {
  const file = join(ROOT, rel);
  if (!existsSync(file) || !statSync(file).isFile()) {
    console.error(`✗ 真源缺少产物：${rel}`);
    process.exit(2);
  }
}

let drifted = 0;
let synced = 0;
let absent = 0;

for (const target of targets) {
  const label = target.replace(/\\/g, '/');
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    console.log(`\n— 跳过（目录不存在）：${label}`);
    absent += 1;
    continue;
  }

  console.log(`\n→ ${label}`);
  for (const rel of ARTIFACTS) {
    const from = join(ROOT, rel);
    const to = join(target, rel);
    const same = existsSync(to) && hashOf(to) === hashOf(from);

    if (same) {
      console.log(`  = 一致    ${rel}`);
      continue;
    }
    if (checkOnly) {
      console.log(`  ! 漂移    ${rel}${existsSync(to) ? '' : '（缺失）'}`);
      drifted += 1;
      continue;
    }

    const existed = existsSync(to);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    console.log(`  ${existed ? '~ 已更新' : '+ 已写入'}  ${rel}`);
    synced += 1;
  }
}

if (checkOnly) {
  if (drifted > 0) {
    console.error(`\n✗ 有 ${drifted} 个文件与真源不一致，请执行：node scripts/sync.mjs`);
    process.exit(1);
  }
  console.log(`\n✔ 已校验 ${targets.length - absent} 个宿主副本，全部与真源一致`);
} else {
  console.log(`\n✔ 同步完成：更新 ${synced} 个文件，跳过 ${absent} 个不存在的目标目录`);
}
