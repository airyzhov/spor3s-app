#!/usr/bin/env node

/**
 * Скрипт для быстрого редактирования контента на VPS
 * Позволяет редактировать промпты, сценарии, напоминания без перезапуска сервера
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Конфигурация
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CONTENT_TYPES = {
  '1': { name: 'ai_prompts', description: 'AI промпты' },
  '2': { name: 'reminder_scenarios', description: 'Сценарии напоминаний' },
  '3': { name: 'gamification_rules', description: 'Правила геймификации' },
  '4': { name: 'dialog_scenarios', description: 'Диалоговые сценарии' },
  '5': { name: 'system_settings', description: 'Системные настройки' }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Функция для запроса пользовательского ввода
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// Функция для HTTP запросов
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка запроса:', error.message);
    return null;
  }
}

// Получение списка контента
async function getContentList(type) {
  const url = `${API_BASE_URL}/api/content-management?type=${type}`;
  const result = await makeRequest(url);
  
  if (!result || !result.data) {
    console.log('❌ Не удалось получить список контента');
    return [];
  }
  
  return result.data;
}

// Получение конкретного контента
async function getContent(type, name) {
  const url = `${API_BASE_URL}/api/content-management?type=${type}&name=${encodeURIComponent(name)}`;
  const result = await makeRequest(url);
  
  if (!result || !result.data || result.data.length === 0) {
    console.log('❌ Контент не найден');
    return null;
  }
  
  return result.data[0];
}

// Обновление контента
async function updateContent(type, name, content, description = '') {
  const url = `${API_BASE_URL}/api/content-management`;
  const result = await makeRequest(url, {
    method: 'POST',
    body: JSON.stringify({
      type,
      name,
      content,
      description,
      isActive: true
    })
  });
  
  if (result && result.success) {
    console.log('✅ Контент успешно обновлен');
    return true;
  } else {
    console.log('❌ Ошибка обновления контента');
    return false;
  }
}

// Создание нового контента
async function createContent(type, name, content, description = '') {
  const url = `${API_BASE_URL}/api/content-management`;
  const result = await makeRequest(url, {
    method: 'POST',
    body: JSON.stringify({
      type,
      name,
      content,
      description,
      isActive: true
    })
  });
  
  if (result && result.success) {
    console.log('✅ Контент успешно создан');
    return true;
  } else {
    console.log('❌ Ошибка создания контента');
    return false;
  }
}

// Главное меню
async function showMainMenu() {
  console.log('\n🎯 СИСТЕМА УПРАВЛЕНИЯ КОНТЕНТОМ SPOR3S');
  console.log('=====================================');
  console.log('Выберите тип контента для редактирования:');
  
  Object.entries(CONTENT_TYPES).forEach(([key, value]) => {
    console.log(`${key}. ${value.description}`);
  });
  console.log('0. Выход');
  
  const choice = await ask('\nВаш выбор: ');
  
  if (choice === '0') {
    console.log('👋 До свидания!');
    rl.close();
    return;
  }
  
  const contentType = CONTENT_TYPES[choice];
  if (!contentType) {
    console.log('❌ Неверный выбор');
    await showMainMenu();
    return;
  }
  
  await showContentMenu(contentType.name);
}

// Меню контента
async function showContentMenu(type) {
  console.log(`\n📝 УПРАВЛЕНИЕ: ${CONTENT_TYPES[Object.keys(CONTENT_TYPES).find(k => CONTENT_TYPES[k].name === type)].description}`);
  console.log('=====================================');
  
  const contentList = await getContentList(type);
  
  if (contentList.length === 0) {
    console.log('📭 Контент не найден');
  } else {
    console.log('Доступный контент:');
    contentList.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}${item.description ? ` - ${item.description}` : ''}`);
    });
  }
  
  console.log('\nДействия:');
  console.log('e. Редактировать существующий');
  console.log('c. Создать новый');
  console.log('b. Назад');
  
  const choice = await ask('\nВаш выбор: ');
  
  switch (choice.toLowerCase()) {
    case 'e':
      if (contentList.length > 0) {
        await editContent(type, contentList);
      } else {
        console.log('❌ Нет контента для редактирования');
        await showContentMenu(type);
      }
      break;
    case 'c':
      await createNewContent(type);
      break;
    case 'b':
      await showMainMenu();
      break;
    default:
      console.log('❌ Неверный выбор');
      await showContentMenu(type);
  }
}

// Редактирование контента
async function editContent(type, contentList) {
  console.log('\n📝 РЕДАКТИРОВАНИЕ КОНТЕНТА');
  console.log('=====================================');
  
  contentList.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name}`);
  });
  
  const choice = await ask('\nВыберите контент для редактирования (номер): ');
  const index = parseInt(choice) - 1;
  
  if (index < 0 || index >= contentList.length) {
    console.log('❌ Неверный выбор');
    await editContent(type, contentList);
    return;
  }
  
  const selectedContent = contentList[index];
  console.log(`\n📝 Редактирование: ${selectedContent.name}`);
  console.log('=====================================');
  
  // Показываем текущий контент
  console.log('Текущий контент:');
  console.log('─'.repeat(50));
  console.log(selectedContent.content);
  console.log('─'.repeat(50));
  
  // Запрашиваем новый контент
  console.log('\nВведите новый контент (Ctrl+D для завершения):');
  const newContent = await ask('Новый контент: ');
  
  if (newContent.trim()) {
    const success = await updateContent(type, selectedContent.name, newContent, selectedContent.description);
    if (success) {
      console.log('✅ Контент обновлен! Изменения применены мгновенно.');
    }
  } else {
    console.log('❌ Контент не может быть пустым');
  }
  
  await showContentMenu(type);
}

// Создание нового контента
async function createNewContent(type) {
  console.log('\n➕ СОЗДАНИЕ НОВОГО КОНТЕНТА');
  console.log('=====================================');
  
  const name = await ask('Название контента: ');
  if (!name.trim()) {
    console.log('❌ Название не может быть пустым');
    await showContentMenu(type);
    return;
  }
  
  const description = await ask('Описание (опционально): ');
  
  console.log('\nВведите контент (Ctrl+D для завершения):');
  const content = await ask('Контент: ');
  
  if (!content.trim()) {
    console.log('❌ Контент не может быть пустым');
    await showContentMenu(type);
    return;
  }
  
  const success = await createContent(type, name, content, description);
  if (success) {
    console.log('✅ Контент создан! Доступен для использования.');
  }
  
  await showContentMenu(type);
}

// Запуск приложения
async function main() {
  console.log('🚀 Запуск системы управления контентом...');
  
  // Проверка подключения к API
  const testResult = await makeRequest(`${API_BASE_URL}/api/content-management?type=ai_prompts`);
  if (!testResult) {
    console.log('❌ Не удалось подключиться к API. Проверьте:');
    console.log('1. Запущен ли сервер на', API_BASE_URL);
    console.log('2. Правильно ли настроены переменные окружения');
    process.exit(1);
  }
  
  console.log('✅ Подключение к API успешно');
  await showMainMenu();
}

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  console.error('❌ Необработанная ошибка:', error);
  process.exit(1);
});

// Запуск
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  makeRequest,
  getContentList,
  getContent,
  updateContent,
  createContent
};
