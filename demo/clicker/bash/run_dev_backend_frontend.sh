#!/bin/bash

echo 'Очень бы хотелось, чтобы этот скрипт заработал, но к сожалению, он не работает' && {
  echo 'Запускайте backend и frontend по отдельности'
  exit 1;
}

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

#echo "current dir: $(pwd)"

# Создаём именованный канал для чтения вывода backend
fifo_backend=$(mktemp -u)
mkfifo "$fifo_backend"

# echo "OUT: 1: $original_dir / $script_dir / $fifo_backend"

relative__backend_path="../backend"

# change dir to backend directory
cd "$relative__backend_path" || {
  echo "Error: can't change dir to $relative__backend_path"
  exit 1
}

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

  # Возвращаемся в исходную директорию
  cd "$original_dir" || {
    echo "Error: can't change dir to $original_dir"
    exit 1
  }
  exit 0
}

# Перехватываем сигналы завершения
trap cleanup_after_all_done EXIT TERM INT

echo "Ожидаем запуск сервера (PID: $backend_npm_pgid)..."

# Читаем вывод из канала в реальном времени
while read -r line; do
    echo "$line"

    # Проверяем, содержит ли строка адрес сервера
    if [[ "$line" =~ http://localhost:([0-9]+) ]]; then
        port="${BASH_REMATCH[1]}"
        echo "Сервер запущен на порту: $port"

        # Основной код скрипта продолжается здесь
        echo "Фоновый процесс продолжает работать (PID: $backend_npm_pgid)"
        echo "current dir: $(pwd)"

        relative__frontend_path="../frontend"

        # change dir to frontend directory
        cd "$relative__frontend_path" || {
          echo "Error: can't change dir to $relative__frontend_path";
          exit 1;
        }

        echo "current dir: $(pwd)"

        # Запускаем WEB-приложение
        VITE_BACKEND_PORT="$port" npx vite
    fi
done < "$fifo_backend"


