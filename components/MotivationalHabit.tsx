import React, { useState, useEffect } from 'react';

interface MotivationalHabitProps {
  userId: string;
  onSCUpdate?: (newSC: number) => void;
}

interface HabitData {
  hasAccess: boolean;
  currentLevel: string;
  levelCode: string;
  currentHabit: any;
  weeklyReports: Array<any>;
  habitProgress: {
    currentWeek: number;
    completedWeeks: number;
    remainingWeeks: number;
    isMonthComplete: boolean;
    progressPercentage: number;
  } | null;
  predefinedHabits: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    difficulty_level: number;
  }>;
  canSelectNewHabit: boolean;
}

interface HabitSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  predefinedHabits: Array<any>;
  onSelectHabit: (habitName: string, habitType: string, description: string) => void;
  loading: boolean;
}

const HabitSelectionModal: React.FC<HabitSelectionModalProps> = ({
  isOpen,
  onClose,
  predefinedHabits,
  onSelectHabit,
  loading
}) => {
  const [selectedHabit, setSelectedHabit] = useState('');
  const [customHabit, setCustomHabit] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const habitName = selectedHabit || customHabit;
    const habitType = selectedHabit ? 'predefined' : 'custom';
    onSelectHabit(habitName, habitType, description);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🌟</div>
            <h3 className="text-lg font-bold text-pink-600 mb-2">Выбери мотивационную привычку</h3>
            <p className="text-sm text-gray-600">
              Выбери привычку на ближайший месяц или создай свою
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Predefined habits */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Выбери из списка:
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {predefinedHabits.map((habit) => (
                  <label key={habit.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="habit"
                      value={habit.name}
                      checked={selectedHabit === habit.name}
                      onChange={(e) => setSelectedHabit(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{habit.icon} {habit.name}</div>
                      <div className="text-sm text-gray-600">{habit.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom habit */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Или создай свою привычку:
              </label>
              <input
                type="text"
                value={customHabit}
                onChange={(e) => setCustomHabit(e.target.value)}
                placeholder="Например: Ежедневная медитация 15 минут"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание (необязательно):
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Дополнительные детали о твоей привычке..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                disabled={loading}
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading || (!selectedHabit && !customHabit.trim())}
                className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Создание...' : 'Создать привычку'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const MotivationalHabit: React.FC<MotivationalHabitProps> = ({ userId, onSCUpdate }) => {
  const [habitData, setHabitData] = useState<HabitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHabitSelection, setShowHabitSelection] = useState(false);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [reportData, setReportData] = useState({
    is_completed: false,
    completion_reason: '',
    feedback_text: '',
    photo_url: ''
  });

  useEffect(() => {
    loadHabitData();
  }, [userId]);

  const loadHabitData = async () => {
    try {
      const response = await fetch(`/api/motivational-habit?user_id=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setHabitData(data);
        // Show habit selection if user has access but no active habit
        if (data.hasAccess && !data.currentHabit && data.canSelectNewHabit) {
          setShowHabitSelection(true);
        }
      } else {
        setError(data.error || 'Ошибка загрузки данных');
      }
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHabit = async (habitName: string, habitType: string, description: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/motivational-habit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          action: 'create_habit',
          habit_name: habitName,
          habit_type: habitType,
          description: description.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setShowHabitSelection(false);
        loadHabitData(); // Reload data
      } else {
        setError(data.error || 'Ошибка создания привычки');
      }
    } catch (err) {
      setError('Ошибка создания привычки');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitWeeklyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!habitData?.currentHabit) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/motivational-habit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          action: 'submit_report',
          habit_id: habitData.currentHabit.id,
          week_number: currentWeek,
          ...reportData
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        if (data.scEarned > 0 && onSCUpdate) {
          onSCUpdate(data.scEarned);
        }
        if (data.isMonthComplete) {
          setSuccess(data.monthCompletionMessage);
        }
        setShowWeeklyReport(false);
        setReportData({
          is_completed: false,
          completion_reason: '',
          feedback_text: '',
          photo_url: ''
        });
        loadHabitData(); // Reload data
      } else {
        setError(data.error || 'Ошибка отправки отчета');
      }
    } catch (err) {
      setError('Ошибка отправки отчета');
    } finally {
      setSubmitting(false);
    }
  };

  const getWeekStatus = (weekNumber: number) => {
    if (!habitData?.weeklyReports) return 'pending';
    const report = habitData.weeklyReports.find(r => r.week_number === weekNumber);
    if (!report) return 'pending';
    return report.is_completed ? 'completed' : 'missed';
  };

  if (loading) {
    return (
      <div className="w-full text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Загрузка...</p>
      </div>
    );
  }

  if (!habitData) {
    return (
      <div className="w-full text-center py-4">
        <p className="text-red-500">Ошибка загрузки данных</p>
      </div>
    );
  }

  if (!habitData.hasAccess) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">Мотивационная привычка</h3>
          <p className="text-sm text-gray-600 mb-4">
            Доступно с уровня "🌿 Собиратель"
          </p>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm font-semibold text-blue-700 mb-2">Условия доступа:</div>
            <div className="text-xs text-blue-600 space-y-1">
              <div>• Накопить 100 SC</div>
              <div>• Сделать минимум 1 заказ</div>
              <div>• Текущий уровень: {habitData.currentLevel}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌟</div>
          <h3 className="text-lg font-bold text-pink-600 mb-2">Мотивационная привычка</h3>
          <p className="text-sm text-gray-600">
            Отслеживай свою привычку еженедельно
          </p>
        </div>

        {/* Current Habit Display */}
        {habitData.currentHabit ? (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-lg p-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-pink-600 mb-1">
                  {habitData.currentHabit.habit_name}
                </div>
                {habitData.currentHabit.description && (
                  <div className="text-sm text-gray-600 mb-2">
                    {habitData.currentHabit.description}
                  </div>
                )}
                {habitData.habitProgress && (
                  <div className="text-sm text-gray-700">
                    {habitData.habitProgress.completedWeeks}/4 недель выполнено
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {habitData.habitProgress && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Прогресс</span>
                  <span>{Math.round(habitData.habitProgress.progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${habitData.habitProgress.progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Weekly Progress */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Недели:</div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((week) => {
                  const status = getWeekStatus(week);
                  return (
                    <div
                      key={week}
                      className={`text-center p-2 rounded text-xs font-medium ${
                        status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : status === 'missed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {week}
                      {status === 'completed' && ' ✓'}
                      {status === 'missed' && ' ✗'}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {habitData.habitProgress && !habitData.habitProgress.isMonthComplete && (
                <button
                  onClick={() => {
                    setCurrentWeek(habitData.habitProgress!.currentWeek);
                    setShowWeeklyReport(true);
                  }}
                  className="w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 transition-colors"
                >
                  📝 Отправить недельный отчет
                </button>
              )}
              
              {habitData.habitProgress?.isMonthComplete && (
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-green-600 font-medium">🎉 Месяц завершен!</div>
                  <div className="text-sm text-green-600">+20 SC бонус за полное выполнение</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className="text-2xl mb-2">📝</div>
            <p className="text-gray-600 mb-4">У тебя пока нет активной привычки</p>
            <button
              onClick={() => setShowHabitSelection(true)}
              className="bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 transition-colors"
            >
              Выбрать привычку
            </button>
          </div>
        )}

        {/* Information */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-700 mb-2">💡 О мотивационных привычках</div>
          <div className="text-xs text-blue-600 space-y-1">
            <div>• Выбирай привычку на 4 недели</div>
            <div>• Отправляй отчет каждую неделю</div>
            <div>• +25 SC за выполнение, +5 SC за объяснение</div>
            <div>• +20 SC бонус за полный месяц</div>
            <div>• После месяца выбирай новую привычку</div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {success}
          </div>
        )}
      </div>

      {/* Habit Selection Modal */}
      <HabitSelectionModal
        isOpen={showHabitSelection}
        onClose={() => setShowHabitSelection(false)}
        predefinedHabits={habitData.predefinedHabits}
        onSelectHabit={handleCreateHabit}
        loading={submitting}
      />

      {/* Weekly Report Modal */}
      {showWeeklyReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-3xl mb-2">📝</div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">Недельный отчет</h3>
                <p className="text-sm text-gray-600">
                  Неделя {currentWeek} - {habitData.currentHabit?.habit_name}
                </p>
              </div>

              <form onSubmit={handleSubmitWeeklyReport}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Удалось ли выполнить привычку на этой неделе?
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="completion"
                        value="true"
                        checked={reportData.is_completed}
                        onChange={() => setReportData({...reportData, is_completed: true})}
                        className="mr-2"
                      />
                      ✅ Да, выполнил(а)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="completion"
                        value="false"
                        checked={!reportData.is_completed}
                        onChange={() => setReportData({...reportData, is_completed: false})}
                        className="mr-2"
                      />
                      ❌ Нет, не удалось
                    </label>
                  </div>
                </div>

                {!reportData.is_completed && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Причина (необязательно):
                    </label>
                    <textarea
                      value={reportData.completion_reason}
                      onChange={(e) => setReportData({...reportData, completion_reason: e.target.value})}
                      placeholder="Что помешало выполнить привычку?"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Обратная связь (необязательно):
                  </label>
                  <textarea
                    value={reportData.feedback_text}
                    onChange={(e) => setReportData({...reportData, feedback_text: e.target.value})}
                    placeholder="Что помогло? Что мешало? Какие ощущения?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowWeeklyReport(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={submitting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Отправка...' : 'Отправить отчет'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MotivationalHabit; 