#!/bin/bash

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

# Функция для завершения
cleanup_after_all_done() {
  # Возвращаемся в исходную директорию
  cd "$original_dir" || {
    echo "Error: can't change dir to $original_dir"
    exit 1
  }
  exit 0
}

# Перехватываем сигналы завершения
trap cleanup_after_all_done EXIT TERM INT

cd ../

# project_name=$(get_package_name) && echo "Run tests for: $project_name"
print_package_name "Run tests for:"

if command -v bun &> /dev/null; then
  bun test ./tests/
else
  jest
fi

cd "$script_dir" || {
  echo "Error: can't change dir to $script_dir"
  exit 1
}

cd ../backend || {
  echo "Error: can't change dir to backend"
  exit 1
}

print_package_name "Run tests for:"

jest

cd ../frontend || {
  echo "Error: can't change dir to frontend"
  exit 1
}

print_package_name "Run tests for:"

npm run test
