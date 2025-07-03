#!/bin/bash

# Данный скрипт:
#  1. Проверит, что pnpm установлен, если он выставлен в package.json в "packageManager"
#  2. Проверит, была ли выполнена установка зависимостей через `pnpm install` и выполнит, если нет
#  3. Запустит backend и дождется инициализации web-сервера fastify
#  4. Получит из вывода backend номер порта на котором стартанул fastify
#  5. Запустил frontend передав в переменной окружения порт на котором стартанул fastify

#echo "current dir: $(pwd)"

# save current pwd
original_dir=$(pwd)

# get dirname of current bash file
script_dir=$(dirname "$(readlink -f "$0")")

# change pwd
cd "$script_dir" || {
  echo "Error: can't change dir to $script_dir"
  exit 1
}

source ./libs/get_package_name.sh
source ./libs/check_nodejs.sh

# Поднимемся в корень проекта
cd "../" || {
  echo "Error: can't change dir to ../"
  exit 1
}

# Проверим, что pnpm установлен
if ! auto_check_pnpm_is_installed; then
  echo -e "\e[31m✖ Ошибка: pnpm не установлен\e[0m"
  exit 1
fi

# Сначала проверим, что `pnpm install` был выполнен и выполним, если нет
if ! check_was_nodejs_deps_installed; then
  print_package_name "Installing deps for:"
  pnpm install
fi

# change pwd
cd "$script_dir" || {
  echo "Error: can't change dir to $script_dir"
  exit 1
}

#echo "current dir: $(pwd)"

# Создаём именованный канал для чтения вывода backend
fifo_backend=$(mktemp -u)
mkfifo "$fifo_backend"
# Создаём именованный канал для получения порта backend. Не можем читать из $fifo_backend, чтобы ненароком не закрыть канал $fifo_backend.
fifo_port=$(mktemp -u)
mkfifo "$fifo_port"

relative__backend_path="../backend"

# change dir to backend directory
cd "$relative__backend_path" || {
  echo "Error: can't change dir to $relative__backend_path"
  exit 1
}

print_package_name "Run:"

# run backend dev script in background
# Запускаем script в новой группе процессов, перенаправляем вывод в канал
(
  npm run dev -- --DETECT_ACTIVITY=1h
) >"$fifo_backend" &
backend_npm_pgid=$!

# Функция для завершения
cleanup_after_all_done() {
  # Т.к. `npm run` порождает отдельный процесс не в своей группе, нужно его как-то завершить:
  #  единственным простым решением, будет поддержка на стороне backend метода для завершения процесса
  curl --silent -o /dev/null "http://localhost:$port/dev_mode_process_exit" || true

  echo "Завершаем фоновый процесс $backend_npm_pgid и все порожденные им процессы (всю группу)..."
  # Отрицательный PID означает всю группу
  kill -- -$backend_npm_pgid 2>/dev/null
  rm -f "$fifo_backend"
  rm -f "$fifo_port"

  # Возвращаемся в исходную директорию
  cd "$original_dir" || {
    echo "Error: can't change dir to $original_dir"
    exit 1
  }
  exit 0
}

# Перехватываем сигналы завершения
trap cleanup_after_all_done EXIT TERM INT

echo "Ожидаем запуск сервера (PID: $backend_npm_pgid): $(get_package_name)"

found=0
# Читаем вывод из канала в реальном времени и перенаправляем вывод в основной stdout.
(
  while read -r line; do
    echo "$line"

    # Проверяем, содержит ли строка адрес сервера
    if [[ $found -eq 0 && "$line" =~ http://localhost:([0-9]+) ]]; then
      # Записываем полученный порт в одноразовый $fifo_port
      echo "${BASH_REMATCH[1]}" >"$fifo_port"
      found=1
    fi
  done <"$fifo_backend"
) &

port=''

# Дожидаемся самой первой строки в отдельном $fifo_port.
# После получения данных и выхода из цикла $fifo_port закроется автоматически.
while read -r line; do
  port="$line"
  break
done <"$fifo_port"

# Основной код скрипта продолжается здесь
echo "Фоновый процесс продолжает работать (PID: $backend_npm_pgid)"
#echo "current dir: $(pwd)"

relative__frontend_path="../frontend"

# change dir to frontend directory
cd "$relative__frontend_path" || {
  echo "Error: can't change dir to $relative__frontend_path"
  exit 1
}

#echo "current dir: $(pwd)"
echo "backend port: $port"

print_package_name "Run:"

# Запускаем WEB-приложение
VITE_BACKEND_PORT="$port" npx vite
