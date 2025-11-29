#!/bin/bash
#
# Скрипт для очистки логов старше 7 дней
# Использование: ./cleanup-logs.sh
# Для автоматизации добавьте в crontab:
# 0 2 * * * /root/tarasov-auto/frontend/production/cleanup-logs.sh >> /root/tarasov-auto/frontend/production/logs/cleanup.log 2>&1

# Путь к папке с логами
LOG_DIR="/root/tarasov-auto/frontend/production/logs"

# Удаляем логи старше 7 дней
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting log cleanup..."

if [ -d "$LOG_DIR" ]; then
  # Подсчитываем количество файлов до очистки
  FILES_BEFORE=$(find "$LOG_DIR" -type f -name "*.log" | wc -l)
  SIZE_BEFORE=$(du -sh "$LOG_DIR" | cut -f1)
  
  echo "Files before: $FILES_BEFORE"
  echo "Size before: $SIZE_BEFORE"
  
  # Удаляем файлы старше 7 дней
  find "$LOG_DIR" -type f -name "*.log" -mtime +7 -delete
  
  # Подсчитываем после очистки
  FILES_AFTER=$(find "$LOG_DIR" -type f -name "*.log" | wc -l)
  SIZE_AFTER=$(du -sh "$LOG_DIR" | cut -f1)
  FILES_DELETED=$((FILES_BEFORE - FILES_AFTER))
  
  echo "Files after: $FILES_AFTER"
  echo "Size after: $SIZE_AFTER"
  echo "Files deleted: $FILES_DELETED"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Log cleanup completed!"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Log directory not found: $LOG_DIR"
  exit 1
fi

