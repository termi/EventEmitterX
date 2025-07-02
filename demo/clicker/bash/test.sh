#!/bin/bash

fifo=$(mktemp -u)
mkfifo "$fifo"

# Процесс-писатель (пример)
{
    for i in {1..5}; do
        echo "Данные $i"
        sleep 1
    done
    echo "Готово" > "$fifo"
} &

# Процесс-читатель (в фоне)
(
    while read -r line; do
        if [[ "$line" == "Готово" ]]; then
            echo "Все данные получены"
            break
        fi
        echo "Обработка: $line"
    done < "$fifo"
) &

# Основной скрипт работает параллельно
for i in {1..3}; do
    echo "Основной скрипт: шаг $i"
    sleep 0.7
done

wait  # Ждём завершения всех фоновых процессов
rm "$fifo"

