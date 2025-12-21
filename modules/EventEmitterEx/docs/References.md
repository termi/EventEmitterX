# References

## Библиотеки

### Сравнение библиотек (AI Generated)

| Библиотека           | Размер   | Производительность | Особенности                     |
|----------------------|----------|--------------------|---------------------------------|
| **Solid.js**         | ~7KB     | Очень высокая      | Наиболее полная реализация      |
| **Preact Signals**   | ~1KB     | Высокая            | Легковесная, интеграция с React |
| **Angular Signals**  | Встроена | Высокая            | Нативная для Angular            |
| **Vue Reactivity**   | Встроена | Высокая            | Нативная для Vue                |
| **MobX**             | ~16KB    | Высокая            | Много возможностей, сложнее     |
| **S.js**             | ~2KB     | Очень высокая      | Минималистичная                 |
| **Maverick Signals** | ~2KB     | Очень высокая      | Современная, tree-shakeable     |

### [SolidJS · Reactive Javascript Library](https://www.solidjs.com/)

```javascript
import { createSignal, createEffect } from "solid-js";

// Простые сигналы
const [count, setCount] = createSignal(0);
const [name, setName] = createSignal("John");

// Эффекты
createEffect(() => {
  console.log(`${name()} count: ${count()}`);
});

// Мемоизированные вычисления
const doubledCount = createMemo(() => count() * 2);

// Пакетные обновления
import { batch } from "solid-js";
batch(() => {
  setCount(10);
  setName("Jane");
});
```

### [Preact Signals](https://preactjs.com/guide/v10/signals/)

```javascript
import { signal, computed, effect, batch } from "@preact/signals";

// Сигналы
const count = signal(0);
const name = signal("John");

// Computed значения
const greeting = computed(() => `Hello ${name.value}! Count: ${count.value}`);

// Эффекты
effect(() => {
  console.log(greeting.value);
});

// Пакетные обновления
batch(() => {
  count.value = 10;
  name.value = "Jane";
});

// React-интеграция
import { useSignal, useComputed } from "@preact/signals-react";
```

### [Angular Signals](https://angular.dev/guide/signals)

```javascript
import { signal, computed, effect } from '@angular/core';

// Сигналы
const count = signal(0);
const name = signal('John');

// Computed значения
const greeting = computed(() => 
  `Hello ${name()}! Count: ${count()}`
);

// Эффекты
effect(() => {
  console.log(greeting());
});

// Обновление с помощью set/update
count.set(10);
count.update(v => v + 1);
```

### [Vue / Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals)

#### Vue 3 Reactivity (Composition API)
```javascript
import { ref, computed, watchEffect, watch } from 'vue';

// Реактивные ссылки (аналоги сигналов)
const count = ref(0);
const name = ref('John');

// Computed свойства
const greeting = computed(() => 
  `Hello ${name.value}! Count: ${count.value}`
);

// Эффекты
watchEffect(() => {
  console.log(greeting.value);
});

// Слежение за изменениями
watch(count, (newVal, oldVal) => {
  console.log(`Count changed from ${oldVal} to ${newVal}`);
});
```

### [S.js](https://github.com/adamhaile/S)

```javascript
import S from "s-js";

// Сигналы
const count = S.data(0);
const name = S.data("John");

// Computed значения
const greeting = S(() => `Hello ${name()}! Count: ${count()}`);

// Эффекты
S(() => console.log(greeting()));

// Пакетные обновления
S.freeze(() => {
  count(10);
  name("Jane");
});
```

### [maverick-js/signals](https://github.com/maverick-js/signals)

```javascript
import { signal, computed, effect, tick } from "@maverick-js/signals";

const count = signal(0);
const double = computed(() => count() * 2);

effect(() => {
  console.log(count(), double());
});

// Автоматически батчит асинхронные обновления
setTimeout(() => {
  count.set(1);
  count.set(2); // Только одно обновление
});
```

### [cellx](https://github.com/Riim/cellx)

```javascript
import { Cell } from "cellx";

const count = new Cell(0);
const name = new Cell("John");

const greeting = new Cell(() => 
  `Hello ${name.get()}! Count: ${count.get()}`
);

greeting.subscribe(value => {
  console.log(value);
});

count.set(10);
```

---
---
---
---
---
---
---
---
---


