#!/bin/bash

# Функция для получения имени из package.json
get_package_name() {
  local package_file="package.json"
  local name=""

  # Проверяем наличие файла
  if [ -f "$package_file" ]; then
    # Извлекаем значение поля name (первое совпадение)
    name=$(grep -m1 '"name":' package.json | awk -F'"' '{print $4}')
  fi

  echo "$name"
  return 0
}

# Функция для вывода имени из package.json: сложная версия
print_package_name() {
  local package_file="package.json"
  local name
  local prefix="${1:-Название проекта:}" # Параметр по умолчанию
  local padding=2                        # Отступы внутри рамки
  local min_length=30                    # Минимальная длина рамки

  # Проверка наличия файла
  if [ ! -f "$package_file" ]; then
    echo -e "\e[31m✖ Ошибка:\e[0m Файл \e[34mpackage.json\e[0m не найден в текущей директории" >&2
    # echo "Ошибка: $package_file не найден" >&2
    return 1
  fi

  # Извлечение имени
  if command -v jq &>/dev/null; then
    name=$(jq -r '.name' "$package_file" 2>/dev/null)
    [[ "$name" == "null" || -z "$name" ]] && name=""
  fi

  [[ -z "$name" ]] && name=$(grep -m1 '"name":' "$package_file" | awk -F'"' '{print $4}')

  # Если имя не найдено
  if [ -z "$name" ]; then
    echo -e "\e[31m✖ Ошибка:\e[0m Поле \e[34mname\e[0m не найдено в \e[34mpackage.json\e[0m" >&2
    # echo "Ошибка: поле 'name' не найдено" >&2
    return 1
  fi

  # Формируем строку содержимого
  local content="$prefix $name"
  local content_length=${#content}

  # Вычисляем длину рамки
  local box_length=$((content_length + padding * 2 + 2)) # +2 для символов рамки
  ((box_length < min_length)) && box_length=$min_length  # Минимальная длина

  local line

  # Создаем горизонтальную линию
  line=$(printf '─%.0s' $(seq 1 $((box_length - 2)))) # -2 для угловых символов

  # Выводим красивую рамку
  echo -e "\e[1;32m\n╭${line}╮\e[0m"
  echo -e "\e[1;32m│\e[0m  \e[1;36m$prefix\e[0m \e[1;33m$name\e[0m  \e[1;32m│\e[0m"
  echo -e "\e[1;32m╰${line}╯\e[0m"

  return 0
}
