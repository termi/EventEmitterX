// src/css-hot-reload-client.js

// Функция для внедрения UI кнопки
export function setupCSSHotReload() {
    // Проверяем, что мы в dev режиме и HMR доступен
    if (!import.meta.hot) {
        console.warn('[CSS Hot Reload] HMR not available');

        return;
    }

    // Инициализируем UI
    injectCSSUpdateButton();

    // Подписываемся на кастомные сообщения от Vite
    import.meta.hot.on('css-update-available', (data) => {
        console.log(`[CSS Hot Reload] CSS file updated: ${data.filename}`);

        // Показываем кнопку обновления
        window.dispatchEvent(new CustomEvent('css-update-received', {
            detail: data,
        }));
    });
}

let updateButton = null;
let currentUpdateData = null;
let timer = 0;

function injectCSSUpdateButton() {
    // Создаем стили для компонента
    const style = document.createElement('style');

    style.textContent = `
    @keyframes css-hot-reload-slide-in {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes css-hot-reload-slide-out {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(100px); opacity: 0; }
    }

    @keyframes css-hot-reload-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .css-hot-reload-notification {
      animation: css-hot-reload-slide-in 0.3s ease-out;
    }

    .css-hot-reload-notification.hiding {
      animation: css-hot-reload-slide-out 0.3s ease-in;
    }
  `;
    document.head.append(style);

    // Слушаем событие обновления CSS
    window.addEventListener('css-update-received', (event) => {
        showUpdateNotification(event.detail);
    });

    // Автоматическое скрытие при нажатии Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && updateButton) {
            hideUpdateButton();
        }
    });
}

function showUpdateNotification(data) {
    const isSame = !!currentUpdateData && currentUpdateData?.file === data?.file;

    if (isSame) {
        return;
    }

    currentUpdateData = data;

    if (!currentUpdateData) {
        hideUpdateButton();

        return;
    }

    // Удаляем предыдущую кнопку, если есть
    if (updateButton) {
        hideUpdateButton(() => {
            createUpdateButton(data);
        });
    }
    else {
        createUpdateButton(data);
    }
}

function createUpdateButton(data) {
    updateButton = document.createElement('div');
    updateButton.className = 'css-hot-reload-notification';
    updateButton.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      padding: 16px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      min-width: 280px;
    ">
      <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
        <div style="
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px;">CSS File Updated</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">${data.filename}</div>
          <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">${data.relativePath || ''}</div>
        </div>
        <button class="css-hot-reload-close" style="
          background: none;
          border: none;
          color: white;
          opacity: 0.7;
          cursor: pointer;
          padding: 4px;
          margin: -4px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="css-hot-reload-apply" style="
          flex: 1;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          <span>Update CSS</span>
        </button>
        <button class="css-hot-reload-ignore" style="
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        ">
          Ignore
        </button>
      </div>
      <div style="
        margin-top: 12px;
        font-size: 11px;
        opacity: 0.7;
        text-align: center;
      ">
        Press <kbd style="
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
        ">ESC</kbd> to dismiss
      </div>
    </div>
  `;

    // Стили позиционирования
    updateButton.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
  `;

    // Добавляем в DOM
    document.body.append(updateButton);

    // Обработчики событий
    updateButton.querySelector('.css-hot-reload-apply').addEventListener('click', applyCSSUpdate);
    updateButton.querySelector('.css-hot-reload-ignore').addEventListener('click', hideUpdateButton);
    updateButton.querySelector('.css-hot-reload-close').addEventListener('click', hideUpdateButton);

    // // Автоматическое скрытие через 30 секунд
    // setTimeout(() => {
    //     if (updateButton && document.body.contains(updateButton)) {
    //         hideUpdateButton()
    //     }
    // }, 30000)
}

function hideUpdateButton(callback) {
    if (typeof callback !== 'function') {
        callback = void 0;
    }

    if (!updateButton) {
        callback?.();

        return;
    }

    updateButton.classList.add('hiding');

    if (timer) {
        clearTimeout(timer);
    }

    timer = setTimeout(() => {
        timer = 0;

        if (updateButton?.parentNode) {
            updateButton.remove();
        }

        updateButton = null;
        currentUpdateData = null;

        callback?.();
    }, 300);
}

async function applyCSSUpdate() {
    if (!currentUpdateData) {
        hideUpdateButton();

        return;
    }

    if (!import.meta.hot) {
        console.error('[CSS Hot Reload] HMR not available');

        return;
    }

    console.log(`[CSS Hot Reload] Applying CSS update for: ${currentUpdateData.file}`);

    // Меняем состояние кнопки
    const applyBtn = updateButton.querySelector('.css-hot-reload-apply');

    if (applyBtn) {
        applyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: css-hot-reload-spin 1s linear infinite;">
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
      <span>Updating...</span>
    `;
        applyBtn.disabled = true;
    }

    /* @vite-ignore */
    await import(location.origin + '/' + currentUpdateData.relativePath + `?${currentUpdateData.timestamp}`);

    const style = document.querySelectorAll(`style[data-vite-dev-id^="${currentUpdateData.file}"]`)[0];

    style?.remove();

    hideUpdateButton();
}
