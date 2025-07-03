#!/bin/bash

# Проверяем, что находимся в директории с проектом Node.js
is_in_nodejs_project() {
  if [ ! -f "package.json" ]; then
    # echo "Error: This is not a Node.js project (package.json not found)."
    return 1
  fi

  return 0
}

# Проверяем, что установка уже производилась
check_was_nodejs_deps_installed() {
  if [ ! -d "node_modules" ]; then
    # echo "has no node_modules"
    return 1
  fi

  # echo "has node_modules"
  return 0
}

# Функция для извлечения значения packageManager из package.json
get_package_manager_from_package_json() {
  local package_json="package.json"
  if grep -q '"packageManager"' "$package_json"; then
    # Извлекаем строку с packageManager и берем значение между кавычками
    grep '"packageManager"' "$package_json" | awk -F'"' '{print $4}'
  else
    echo ""
  fi
}

# Функция для детектирования значения packageManager, который использовался для установки зависимостей
get_package_manager_from_existed_lock_file() {
  local used_package_manager=""

  if [ -d "node_modules" ]; then
    if [ -f "pnpm-lock.yaml" ]; then
      used_package_manager="pnpm"
    elif [ -f "yarn.lock" ]; then
      used_package_manager="yarn"
    elif [ -f "package-lock.json" ]; then
      used_package_manager="npm"
    else
      # неизвестно (node_modules есть, но lock-файл не найден)
      used_package_manager=""
    fi
  fi

  echo "$used_package_manager"
}

check_pnpm_is_installed() {
  if command -v pnpm &>/dev/null; then
    # echo "pnpm установлен: $(pnpm --version)"
    return 0
  else
    # echo "pnpm указан в package.json, но не установлен в системе!"
    return 1
  fi
}

auto_check_pnpm_is_installed() {
  # Проверяем, какой пакетный менеджер указан в package.json
  package_manager_in_package_json=$(get_package_manager_from_package_json)

  if [ -n "$package_manager_in_package_json" ]; then
    # echo "Пакетный менеджер в package.json: $package_manager_in_package_json"

    # Если указан pnpm, проверяем его наличие в системе
    if [[ "$package_manager_in_package_json" == pnpm@* ]]; then
      check_pnpm_is_installed
    fi
  fi
}
