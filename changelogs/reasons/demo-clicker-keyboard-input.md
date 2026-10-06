---
iso date: "2026-10-06T16:53:22.060Z"
timestamp: 1791305602060
ai_model: "GPT6"
git user: '"Egor Halimonenko" <termi_uc@inbox.ru>'
area: "frontend"
---

# Preserve trusted click input while improving keyboard access

## Problem

`demo/clicker/frontend/src/signalComponents/SelectedRound.tsx` originally used a clickable `div` with ASCII artwork. It was neither a keyboard control nor a semantic button. Its handler rejects events when `event.isTrusted` is false and reads the round identifier from `event.currentTarget.dataset.roundId`.

## Decision and mechanism

Replace the container with a native `button type="button"`, retaining the handler and `data-round-id` on the same element. Native Enter and Space activation generates a browser click without a custom keyboard handler. The decorative arrow is hidden from assistive technology, and the visible action text names the control.

Round list entries also receive keyboard selection, focus styling and `aria-pressed`. Their Enter/Space handler calls `currentTarget.click()` and prevents default scrolling. This is suitable for selection because that handler does not require a trusted event; the game action deliberately uses native button activation instead.

## Example and alternatives

Select a running round, focus “Кликайте сюда” and press Enter: the existing click handler accepts the native event and updates the score. Calling `.click()` from a custom key handler on the former game-action `div` would produce an untrusted event and be rejected. Removing the trust guard would alter game behavior without being necessary for the visual task. Keeping a `div` with an added role would still require implementing native keyboard semantics manually.

## Verification and limits

Browser verification of Enter on the native button increased both personal and total scores from 0 to 1 in an isolated review database. The frontend suite passes 54 tests with Node 26 experimental webstorage disabled for both the runner and its workers. Default execution still has five setup failures involving `localStorage`; the temporary test configuration is ignored and is not part of the changes. This redesign does not replace backend validation or change the existing game timing and scoring rules.

---

## [RU] Проблема

В `demo/clicker/frontend/src/signalComponents/SelectedRound.tsx` использовался кликабельный `div` с ASCII-рисунком. Он не был клавиатурным элементом управления или семантической кнопкой. Его обработчик отклоняет события, если `event.isTrusted` равно false, и читает идентификатор раунда из `event.currentTarget.dataset.roundId`.

## [RU] Решение и механизм

Контейнер заменён нативной кнопкой `button type="button"`; обработчик и `data-round-id` сохранены на том же элементе. Нативная активация Enter и Space создаёт браузерный клик без отдельного клавиатурного обработчика. Декоративная стрелка скрыта от вспомогательных технологий, а видимый текст действия задаёт имя элемента управления.

Элементы списка раундов также получили клавиатурный выбор, оформление фокуса и `aria-pressed`. Их обработчик Enter/Space вызывает `currentTarget.click()` и предотвращает прокрутку по умолчанию. Это подходит для выбора, поскольку его обработчик не требует доверенного события; игровое действие намеренно использует нативную активацию кнопки.

## [RU] Пример и альтернативы

Выберите текущий раунд, установите фокус на «Кликайте сюда» и нажмите Enter: существующий обработчик принимает нативное событие и обновляет счёт. Вызов `.click()` из отдельного клавиатурного обработчика прежнего игрового `div` создал бы недоверенное событие, которое было бы отклонено. Удаление проверки доверенности изменило бы поведение игры без необходимости для визуальной задачи. Сохранение `div` с добавлением роли всё равно потребовало бы ручной реализации нативной клавиатурной семантики.

## [RU] Проверка и ограничения

При проверке в браузере Enter на нативной кнопке увеличил личный и общий счёт с 0 до 1 в изолированной базе проверки. Набор frontend-тестов проходит все 54 теста при отключении экспериментального webstorage Node 26 для запускающего процесса и его рабочих процессов. Запуск по умолчанию по-прежнему имеет пять ошибок подготовки, связанных с `localStorage`; временная тестовая конфигурация игнорируется и не входит в изменения. Обновление дизайна не заменяет серверную валидацию и не меняет существующие правила времени и подсчёта очков.
