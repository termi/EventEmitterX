#!/bin/bash

## Не работает: не доделано

fifo1=$(mktemp -u)
mkfifo "$fifo1"
fifo2=$(mktemp -u)
mkfifo "$fifo2"

# Процесс-писатель #1
(
    for i in {1..5}; do
        echo "Данные #1 $i"
        sleep 1
    done
    echo "Данные #1: Готово"
) > "$fifo1" &
# Процесс-писатель #2
(
    for i in {1..5}; do
        echo "Данные #2 $i"
        sleep 2
    done
    echo "Данные #2: Готово"
) > "$fifo2" &

# Процесс-читатель $fifo1 (в фоне)
(
    while read -r line; do
        if [[ "$line" == "Данные #1: Готово" ]]; then
            echo "Все данные получены: $line"
            break
        fi
        echo "Обработка: $line"
    done < "$fifo1"
) &

# Сначала читаем первые 3 строки
head -n 3 "$fifo2" | while read -r line; do
    echo "$line (обработано в while)"
done

# Потом продолжаем читать новые данные через `tail -n +4`
tail -n +4 -f "$fifo2" &

# Основной скрипт работает параллельно
for i in {1..3}; do
    echo "Основной скрипт: шаг $i"
    sleep 0.7
done

wait  # Ждём завершения всех фоновых процессов
rm "$fifo1"

