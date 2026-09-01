#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "${script_dir}/.." && pwd)"
public_dir="${project_dir}/public"

mkdir -p "${public_dir}/image"

install -m 0644 "${project_dir}/index.html" "${public_dir}/index.html"
install -m 0644 "${project_dir}/cases.html" "${public_dir}/cases.html"
install -m 0644 "${project_dir}/home.css" "${public_dir}/home.css"
install -m 0644 "${project_dir}/home.js" "${public_dir}/home.js"
install -m 0644 "${project_dir}/styles.css" "${public_dir}/styles.css"
install -m 0644 "${project_dir}/game.js" "${public_dir}/game.js"
install -m 0644 "${project_dir}/series-archive.js" "${public_dir}/series-archive.js"
install -m 0644 "${project_dir}/case01.html" "${public_dir}/case01.html"
install -m 0644 "${project_dir}/case02.html" "${public_dir}/case02.html"
install -m 0644 "${project_dir}/case02.css" "${public_dir}/case02.css"
install -m 0644 "${project_dir}/case02.js" "${public_dir}/case02.js"
install -m 0644 "${project_dir}/case03.html" "${public_dir}/case03.html"
install -m 0644 "${project_dir}/case03.css" "${public_dir}/case03.css"
install -m 0644 "${project_dir}/case03.js" "${public_dir}/case03.js"
install -m 0644 "${project_dir}/image/station-control-room.png" "${public_dir}/image/station-control-room.png"
install -m 0644 "${project_dir}/image/yun-portrait.png" "${public_dir}/image/yun-portrait.png"
install -m 0644 "${project_dir}/image/echo7-portrait.png" "${public_dir}/image/echo7-portrait.png"
install -m 0644 "${project_dir}/image/archive-hall.png" "${public_dir}/image/archive-hall.png"
install -m 0644 "${project_dir}/image/mia-portrait.png" "${public_dir}/image/mia-portrait.png"
install -m 0644 "${project_dir}/image/memory-vault.png" "${public_dir}/image/memory-vault.png"
install -m 0644 "${project_dir}/image/lan-portrait.png" "${public_dir}/image/lan-portrait.png"
install -m 0644 "${project_dir}/image/series-cover.png" "${public_dir}/image/series-cover.png"

# public/ 采用严格白名单；发现额外文件时停止发布，防止误公开 PDF、设计文档或备份素材。
while IFS= read -r -d '' file; do
  relative_path="${file#"${public_dir}/"}"
  case "${relative_path}" in
    index.html|cases.html|home.css|home.js|styles.css|game.js|series-archive.js|case01.html|case02.html|case02.css|case02.js|case03.html|case03.css|case03.js|image/station-control-room.png|image/yun-portrait.png|image/echo7-portrait.png|image/archive-hall.png|image/mia-portrait.png|image/memory-vault.png|image/lan-portrait.png|image/series-cover.png)
      ;;
    *)
      echo "拒绝构建：public/ 中存在非白名单文件：${relative_path}" >&2
      exit 1
      ;;
  esac
done < <(find "${public_dir}" -type f -print0)

echo "公开发布包已生成：${public_dir}"
