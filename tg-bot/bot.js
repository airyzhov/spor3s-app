"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var telegraf_1 = require("telegraf");
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv = __importStar(require("dotenv"));
var node_fetch_1 = __importDefault(require("node-fetch"));
var path_1 = __importDefault(require("path"));
// Загружаем .env и .env.local (.env.local имеет приоритет)
dotenv.config({ path: path_1.default.join(__dirname, '.env') });
dotenv.config({ path: path_1.default.join(__dirname, '.env.local'), override: true });
console.log('🔧 Переменные окружения загружены');
console.log('🔍 Отладка переменных окружения:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ЕСТЬ' : 'НЕТ');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'ЕСТЬ' : 'НЕТ');
var bot = new telegraf_1.Telegraf(process.env.TELEGRAM_BOT_TOKEN);
var supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Кеш контекста в памяти (fallback если Supabase не работает)
var userContextCache = new Map();
// Функция для получения или создания пользователя
function getOrCreateUser(telegramId, userInfo) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, existingUser, selectError, _b, newUser, insertError, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, supabase
                            .from('users')
                            .select('id, name')
                            .eq('telegram_id', telegramId)
                            .single()];
                case 1:
                    _a = _c.sent(), existingUser = _a.data, selectError = _a.error;
                    if (existingUser) {
                        return [2 /*return*/, existingUser];
                    }
                    return [4 /*yield*/, supabase
                            .from('users')
                            .insert([{
                                telegram_id: telegramId,
                                name: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.first_name) || (userInfo === null || userInfo === void 0 ? void 0 : userInfo.username) || 'User'
                            }])
                            .select('id, name')
                            .single()];
                case 2:
                    _b = _c.sent(), newUser = _b.data, insertError = _b.error;
                    if (insertError) {
                        console.warn("\u26A0\uFE0F Supabase error: ".concat(insertError.message, ", using fallback mode"));
                        // Fallback: возвращаем объект с telegram_id как id
                        return [2 /*return*/, { id: telegramId, name: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.first_name) || 'User' }];
                    }
                    return [2 /*return*/, newUser];
                case 3:
                    error_1 = _c.sent();
                    console.warn('⚠️ Supabase unavailable, using fallback mode');
                    return [2 /*return*/, { id: telegramId, name: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.first_name) || 'User' }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Функция для сохранения сообщения в базу
function saveMessage(userId_1, content_1) {
    return __awaiter(this, arguments, void 0, function (userId, content, role) {
        var error;
        if (role === void 0) { role = 'user'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, supabase
                        .from('messages')
                        .insert([{
                            user_id: userId,
                            role: role,
                            content: content,
                            created_at: new Date().toISOString()
                        }])];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error saving message:', error);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
// Функция для вызова ИИ API
function callAI(message, context, userId, telegramId) {
    return __awaiter(this, void 0, void 0, function () {
        var response, text, data, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001', "/api/ai"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                message: message,
                                context: context,
                                source: 'telegram_bot',
                                user_id: userId,
                                telegram_id: telegramId
                            })
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text().catch(function () { return ''; })];
                case 2:
                    text = _a.sent();
                    throw new Error("HTTP ".concat(response.status, ". ").concat(text));
                case 3: return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                case 4:
                    data = _a.sent();
                    return [2 /*return*/, data.response || data.reply || 'Извините, не удалось получить ответ от ИИ.'];
                case 5:
                    error_2 = _a.sent();
                    console.error('AI API error:', error_2);
                    return [2 /*return*/, 'Извините, произошла ошибка при обращении к ИИ. Попробуйте позже.'];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// Генерация корректной deep-link для Mini App
function buildMiniAppLink(telegramId) {
    return __awaiter(this, void 0, void 0, function () {
        var botUsername, baseUrl, resp, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    botUsername = process.env.BOT_USERNAME || 'spor3s_bot';
                    baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(baseUrl, "/api/generate-auth-code"), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ telegram_id: telegramId })
                        })];
                case 2:
                    resp = _b.sent();
                    if (!resp.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, resp.json()];
                case 3:
                    data = _b.sent();
                    if (data === null || data === void 0 ? void 0 : data.auth_code) {
                        return [2 /*return*/, "https://t.me/".concat(botUsername, "?startapp=").concat(encodeURIComponent(data.auth_code))];
                    }
                    _b.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    _a = _b.sent();
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/, "https://t.me/".concat(botUsername)];
            }
        });
    });
}
// Функция для создания заказа
function createOrder(userId, orderData) {
    return __awaiter(this, void 0, void 0, function () {
        var response, errorData, data, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000', "/api/order-simple"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(__assign({ user_id: userId }, orderData))
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    errorData = _a.sent();
                    throw new Error(errorData.error || 'Ошибка создания заказа');
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    data = _a.sent();
                    return [2 /*return*/, data];
                case 5:
                    error_3 = _a.sent();
                    console.error('Order API error:', error_3);
                    throw error_3;
                case 6: return [2 /*return*/];
            }
        });
    });
}
// Функция для отправки уведомления менеджеру
function notifyManager(orderData, userInfo) {
    return __awaiter(this, void 0, void 0, function () {
        var managerChatId, message, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    managerChatId = process.env.MANAGER_CHAT_ID;
                    if (!managerChatId) {
                        console.log('MANAGER_CHAT_ID not set, skipping notification');
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    message = "\uD83C\uDD95 \u041D\u041E\u0412\u042B\u0419 \u0417\u0410\u041A\u0410\u0417 \u0427\u0415\u0420\u0415\u0417 \u0411\u041E\u0422\u0410!\n\n\uD83D\uDC64 \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C: ".concat(userInfo.first_name, " ").concat(userInfo.last_name || '', " (@").concat(userInfo.username || 'без username', ")\n\uD83C\uDD94 Telegram ID: ").concat(userInfo.id, "\n\n\uD83D\uDCE6 \u0422\u043E\u0432\u0430\u0440\u044B: ").concat(JSON.stringify(orderData.items), "\n\uD83D\uDCB0 \u0421\u0443\u043C\u043C\u0430: ").concat(orderData.total, "\u20BD\n\uD83D\uDCCD \u0410\u0434\u0440\u0435\u0441: ").concat(orderData.address, "\n\uD83D\uDCDE \u0422\u0435\u043B\u0435\u0444\u043E\u043D: ").concat(orderData.phone, "\n\uD83D\uDC64 \u0424\u0418\u041E: ").concat(orderData.fio, "\n\uD83D\uDCAC \u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439: ").concat(orderData.comment || 'нет', "\n\n\uD83D\uDD50 \u0412\u0440\u0435\u043C\u044F: ").concat(new Date().toLocaleString('ru-RU'));
                    return [4 /*yield*/, bot.telegram.sendMessage(managerChatId, message)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    console.error('Error notifying manager:', error_4);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Функция для проверки YouTube подписки
function verifyYouTubeSubscription(userId, channelId) {
    return __awaiter(this, void 0, void 0, function () {
        var response, errorData, data, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, (0, node_fetch_1.default)("".concat(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000', "/api/subscribe-bonus"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                user_id: userId,
                                channel_type: 'youtube'
                            })
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    errorData = _a.sent();
                    throw new Error(errorData.error || 'Ошибка проверки подписки');
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    data = _a.sent();
                    return [2 /*return*/, data];
                case 5:
                    error_5 = _a.sent();
                    console.error('YouTube verification error:', error_5);
                    throw error_5;
                case 6: return [2 /*return*/];
            }
        });
    });
}
// /start <auth_code> - привязка аккаунта
bot.start(function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var parts, auth_code, link, updateError, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parts = ctx.message.text.split(' ');
                if (!(parts.length === 2)) return [3 /*break*/, 6];
                auth_code = parts[1];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, supabase
                        .from('tg_link_codes')
                        .select('user_id, telegram_id, expires_at')
                        .eq('auth_code', auth_code)
                        .single()];
            case 2:
                link = (_a.sent()).data;
                if (!link) {
                    return [2 /*return*/, ctx.reply('❌ Код не найден или истёк.')];
                }
                if (new Date(link.expires_at) < new Date()) {
                    return [2 /*return*/, ctx.reply('❌ Код истёк.')];
                }
                return [4 /*yield*/, supabase
                        .from('users')
                        .update({ telegram_id: ctx.from.id.toString() })
                        .eq('id', link.user_id)];
            case 3:
                updateError = (_a.sent()).error;
                if (updateError) {
                    return [2 /*return*/, ctx.reply('❌ Ошибка привязки: ' + updateError.message)];
                }
                ctx.reply('✅ Привязка успешна! Теперь вы можете общаться с ИИ агентом spor3s.');
                return [3 /*break*/, 5];
            case 4:
                error_6 = _a.sent();
                ctx.reply('❌ Ошибка привязки: ' + error_6.message);
                return [3 /*break*/, 5];
            case 5: return [3 /*break*/, 7];
            case 6:
                ctx.reply('Привет! Для привязки аккаунта отправьте: /start <код>\n\nИли просто напишите мне, и я помогу с выбором грибных добавок! 🍄');
                _a.label = 7;
            case 7: return [2 /*return*/];
        }
    });
}); });
// /verify_youtube @spor3s - проверка YouTube подписки
bot.command('verify_youtube', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var telegram_id, user, existingBonus, instructions, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                telegram_id = ctx.from.id.toString();
                return [4 /*yield*/, getOrCreateUser(telegram_id, ctx.from)];
            case 1:
                user = _a.sent();
                return [4 /*yield*/, supabase
                        .from('coin_transactions')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('type', 'subscribe_youtube')
                        .single()];
            case 2:
                existingBonus = (_a.sent()).data;
                if (existingBonus) {
                    return [2 /*return*/, ctx.reply('✅ Вы уже получили бонус за подписку на YouTube канал! +50 SC')];
                }
                instructions = "\uD83D\uDCFA \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043D\u0430 YouTube \u043A\u0430\u043D\u0430\u043B @spor3s\n\n\uD83D\uDD0D \u0414\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438:\n\n1\uFE0F\u20E3 \u041F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043D\u0430 \u043A\u0430\u043D\u0430\u043B: https://www.youtube.com/@spor3s\n2\uFE0F\u20E3 \u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0432\u044B \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u044B \u043D\u0430 \u043A\u0430\u043D\u0430\u043B\n3\uFE0F\u20E3 \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u0432 \u044D\u0442\u043E\u0442 \u0447\u0430\u0442\n\n\uD83D\uDCF8 \u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0434\u043E\u043B\u0436\u0435\u043D \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C:\n\u2022 \u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u0430\u043D\u0430\u043B\u0430 @spor3s\n\u2022 \u041A\u043D\u043E\u043F\u043A\u0443 \"\u041F\u043E\u0434\u043F\u0438\u0441\u043A\u0430\" (\u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u0430)\n\u2022 \u0418\u043B\u0438 \u0441\u0442\u0430\u0442\u0443\u0441 \"\u0412\u044B \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u044B\"\n\n\uD83D\uDCB0 \u041F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435: +50 SC\n\n\u26A0\uFE0F \u0412\u043D\u0438\u043C\u0430\u043D\u0438\u0435: \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u043C\u043E\u0434\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u043C \u0432 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 24 \u0447\u0430\u0441\u043E\u0432.";
                return [4 /*yield*/, ctx.reply(instructions)];
            case 3:
                _a.sent();
                // Сохраняем состояние ожидания скриншота
                return [4 /*yield*/, supabase
                        .from('youtube_verification_requests')
                        .insert([{
                            user_id: user.id,
                            telegram_id: telegram_id,
                            status: 'pending',
                            created_at: new Date().toISOString()
                        }])];
            case 4:
                // Сохраняем состояние ожидания скриншота
                _a.sent();
                return [3 /*break*/, 6];
            case 5:
                error_7 = _a.sent();
                console.error('Error in verify_youtube command:', error_7);
                ctx.reply('❌ Ошибка проверки подписки: ' + error_7.message);
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Обработка фото для проверки YouTube подписки
bot.on('photo', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var telegram_id, user, verificationRequest, photo, file, photoUrl, managerChatId, managerMessage, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 8, , 9]);
                telegram_id = ctx.from.id.toString();
                return [4 /*yield*/, getOrCreateUser(telegram_id, ctx.from)];
            case 1:
                user = _a.sent();
                return [4 /*yield*/, supabase
                        .from('youtube_verification_requests')
                        .select('id, status')
                        .eq('user_id', user.id)
                        .eq('status', 'pending')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single()];
            case 2:
                verificationRequest = (_a.sent()).data;
                if (!verificationRequest) {
                    return [2 /*return*/, ctx.reply('❌ Сначала отправьте команду /verify_youtube @spor3s для начала проверки.')];
                }
                photo = ctx.message.photo[ctx.message.photo.length - 1];
                return [4 /*yield*/, bot.telegram.getFile(photo.file_id)];
            case 3:
                file = _a.sent();
                photoUrl = "https://api.telegram.org/file/bot".concat(process.env.TELEGRAM_BOT_TOKEN, "/").concat(file.file_path);
                // Обновляем заявку с URL фото
                return [4 /*yield*/, supabase
                        .from('youtube_verification_requests')
                        .update({
                        screenshot_url: photoUrl,
                        status: 'screenshot_received',
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', verificationRequest.id)];
            case 4:
                // Обновляем заявку с URL фото
                _a.sent();
                managerChatId = process.env.MANAGER_CHAT_ID;
                if (!managerChatId) return [3 /*break*/, 6];
                managerMessage = "\uD83D\uDCF8 \u041D\u041E\u0412\u0410\u042F \u0417\u0410\u042F\u0412\u041A\u0410 \u041D\u0410 \u041F\u0420\u041E\u0412\u0415\u0420\u041A\u0423 YOUTUBE \u041F\u041E\u0414\u041F\u0418\u0421\u041A\u0418!\n\n\uD83D\uDC64 \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C: ".concat(ctx.from.first_name, " ").concat(ctx.from.last_name || '', " (@").concat(ctx.from.username || 'без username', ")\n\uD83C\uDD94 Telegram ID: ").concat(ctx.from.id, "\n\uD83C\uDD94 User ID: ").concat(user.id, "\n\n\uD83D\uDCF8 \u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442: ").concat(photoUrl, "\n\n\u2705 \u0414\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F: /approve_youtube ").concat(user.id, "\n\u274C \u0414\u043B\u044F \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u044F: /reject_youtube ").concat(user.id, "\n\n\uD83D\uDD50 \u0412\u0440\u0435\u043C\u044F: ").concat(new Date().toLocaleString('ru-RU'));
                return [4 /*yield*/, bot.telegram.sendMessage(managerChatId, managerMessage)];
            case 5:
                _a.sent();
                _a.label = 6;
            case 6: return [4 /*yield*/, ctx.reply('📸 Скриншот получен! Модератор проверит вашу подписку в течение 24 часов. Вы получите уведомление о результате.')];
            case 7:
                _a.sent();
                return [3 /*break*/, 9];
            case 8:
                error_8 = _a.sent();
                console.error('Error processing photo:', error_8);
                ctx.reply('❌ Ошибка обработки скриншота. Попробуйте еще раз.');
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// Команды для модератора
bot.command('approve_youtube', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var parts, userId, managerChatId, result, user, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                parts = ctx.message.text.split(' ');
                if (parts.length !== 2) {
                    return [2 /*return*/, ctx.reply('❌ Использование: /approve_youtube <user_id>')];
                }
                userId = parts[1];
                managerChatId = process.env.MANAGER_CHAT_ID;
                // Проверяем, что команда от модератора
                if (ctx.from.id.toString() !== managerChatId) {
                    return [2 /*return*/, ctx.reply('❌ У вас нет прав для выполнения этой команды.')];
                }
                return [4 /*yield*/, verifyYouTubeSubscription(userId, '@spor3s')];
            case 1:
                result = _a.sent();
                // Обновляем статус заявки
                return [4 /*yield*/, supabase
                        .from('youtube_verification_requests')
                        .update({
                        status: 'approved',
                        approved_at: new Date().toISOString(),
                        approved_by: ctx.from.id.toString()
                    })
                        .eq('user_id', userId)
                        .eq('status', 'screenshot_received')];
            case 2:
                // Обновляем статус заявки
                _a.sent();
                return [4 /*yield*/, supabase
                        .from('users')
                        .select('telegram_id')
                        .eq('id', userId)
                        .single()];
            case 3:
                user = (_a.sent()).data;
                if (!(user === null || user === void 0 ? void 0 : user.telegram_id)) return [3 /*break*/, 5];
                return [4 /*yield*/, bot.telegram.sendMessage(user.telegram_id, '✅ Ваша подписка на YouTube канал @spor3s подтверждена!\n\n💰 Начислено: +50 SC\n\nСпасибо за подписку! 🍄')];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5: return [4 /*yield*/, ctx.reply("\u2705 \u0411\u043E\u043D\u0443\u0441 \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E ".concat(userId, "! +50 SC"))];
            case 6:
                _a.sent();
                return [3 /*break*/, 8];
            case 7:
                error_9 = _a.sent();
                console.error('Error approving YouTube subscription:', error_9);
                ctx.reply('❌ Ошибка подтверждения: ' + error_9.message);
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
bot.command('reject_youtube', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var parts, userId, managerChatId, user, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                parts = ctx.message.text.split(' ');
                if (parts.length !== 2) {
                    return [2 /*return*/, ctx.reply('❌ Использование: /reject_youtube <user_id>')];
                }
                userId = parts[1];
                managerChatId = process.env.MANAGER_CHAT_ID;
                // Проверяем, что команда от модератора
                if (ctx.from.id.toString() !== managerChatId) {
                    return [2 /*return*/, ctx.reply('❌ У вас нет прав для выполнения этой команды.')];
                }
                // Обновляем статус заявки
                return [4 /*yield*/, supabase
                        .from('youtube_verification_requests')
                        .update({
                        status: 'rejected',
                        rejected_at: new Date().toISOString(),
                        rejected_by: ctx.from.id.toString()
                    })
                        .eq('user_id', userId)
                        .eq('status', 'screenshot_received')];
            case 1:
                // Обновляем статус заявки
                _a.sent();
                return [4 /*yield*/, supabase
                        .from('users')
                        .select('telegram_id')
                        .eq('id', userId)
                        .single()];
            case 2:
                user = (_a.sent()).data;
                if (!(user === null || user === void 0 ? void 0 : user.telegram_id)) return [3 /*break*/, 4];
                return [4 /*yield*/, bot.telegram.sendMessage(user.telegram_id, '❌ Ваша заявка на проверку YouTube подписки отклонена.\n\n📺 Убедитесь, что вы подписаны на канал @spor3s и отправьте новый скриншот командой /verify_youtube @spor3s')];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4: return [4 /*yield*/, ctx.reply("\u274C \u0417\u0430\u044F\u0432\u043A\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ".concat(userId, " \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0430."))];
            case 5:
                _a.sent();
                return [3 /*break*/, 7];
            case 6:
                error_10 = _a.sent();
                console.error('Error rejecting YouTube subscription:', error_10);
                ctx.reply('❌ Ошибка отклонения: ' + (error_10 instanceof Error ? error_10.message : 'Неизвестная ошибка'));
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// /my_coins — баланс пользователя
bot.command('my_coins', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var telegram_id, user, userLevel, balance, level, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                telegram_id = ctx.from.id.toString();
                return [4 /*yield*/, getOrCreateUser(telegram_id, ctx.from)];
            case 1:
                user = _a.sent();
                return [4 /*yield*/, supabase
                        .from('user_levels')
                        .select('current_sc_balance, current_level')
                        .eq('user_id', user.id)
                        .single()];
            case 2:
                userLevel = (_a.sent()).data;
                balance = (userLevel === null || userLevel === void 0 ? void 0 : userLevel.current_sc_balance) || 0;
                level = (userLevel === null || userLevel === void 0 ? void 0 : userLevel.current_level) || '🌱 Новичок';
                ctx.reply("\uD83D\uDCB0 \u0412\u0430\u0448 \u0431\u0430\u043B\u0430\u043D\u0441 Spor3s Coins: ".concat(balance, " SC\n\uD83C\uDFC6 \u0423\u0440\u043E\u0432\u0435\u043D\u044C: ").concat(level));
                return [3 /*break*/, 4];
            case 3:
                error_11 = _a.sent();
                ctx.reply('❌ Ошибка получения баланса: ' + error_11.message);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// /help — справка
bot.command('help', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var helpText;
    return __generator(this, function (_a) {
        helpText = "\uD83E\uDD16 \u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 spor3s AI Assistant!\n\n\uD83C\uDF44 \u042F \u043F\u043E\u043C\u043E\u0433\u0443 \u0432\u0430\u043C \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0433\u0440\u0438\u0431\u043D\u044B\u0435 \u0434\u043E\u0431\u0430\u0432\u043A\u0438:\n\u2022 \u0415\u0436\u043E\u0432\u0438\u043A \u2014 \u0434\u043B\u044F \u043F\u0430\u043C\u044F\u0442\u0438 \u0438 \u043A\u043E\u043D\u0446\u0435\u043D\u0442\u0440\u0430\u0446\u0438\u0438\n\u2022 \u041C\u0443\u0445\u043E\u043C\u043E\u0440 \u2014 \u0434\u043B\u044F \u0441\u043D\u0430 \u0438 \u0441\u043D\u044F\u0442\u0438\u044F \u0441\u0442\u0440\u0435\u0441\u0441\u0430  \n\u2022 \u041A\u043E\u0440\u0434\u0438\u0446\u0435\u043F\u0441 \u2014 \u0434\u043B\u044F \u044D\u043D\u0435\u0440\u0433\u0438\u0438\n\u2022 \u041A\u0443\u0440\u0441 4 \u0432 1 \u2014 \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0441\u043D\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435\n\n\uD83D\uDCAC \u041F\u0440\u043E\u0441\u0442\u043E \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043C\u043D\u0435, \u0447\u0442\u043E \u0432\u0430\u0441 \u0431\u0435\u0441\u043F\u043E\u043A\u043E\u0438\u0442, \u0438 \u044F \u043F\u043E\u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u044E \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B!\n\n\uD83D\uDCCB \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B:\n/my_coins \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0431\u0430\u043B\u0430\u043D\u0441 SC\n/verify_youtube @spor3s \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0443 \u043D\u0430 YouTube (+50 SC)\n/help \u2014 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u044D\u0442\u0443 \u0441\u043F\u0440\u0430\u0432\u043A\u0443\n/start <\u043A\u043E\u0434> \u2014 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\n\n\uD83D\uDED2 \u041C\u043E\u0436\u0435\u0442\u0435 \u043E\u0444\u043E\u0440\u043C\u0438\u0442\u044C \u0437\u0430\u043A\u0430\u0437 \u043F\u0440\u044F\u043C\u043E \u0432 \u0447\u0430\u0442\u0435!";
        ctx.reply(helpText);
        return [2 /*return*/];
    });
}); });
// Обработка всех текстовых сообщений
bot.on('text', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var telegram_id, user, userMessage, messages, recentMessages, error_12, aiResponse, error_13, appLink, keyboard, appLink, error_14;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 19, , 20]);
                telegram_id = ctx.from.id.toString();
                return [4 /*yield*/, getOrCreateUser(telegram_id, ctx.from)];
            case 1:
                user = _a.sent();
                userMessage = ctx.message.text;
                // Показываем "печатает..."
                return [4 /*yield*/, ctx.replyWithChatAction('typing')];
            case 2:
                // Показываем "печатает..."
                _a.sent();
                messages = [];
                _a.label = 3;
            case 3:
                _a.trys.push([3, 6, , 7]);
                // Сохраняем сообщение пользователя
                return [4 /*yield*/, saveMessage(user.id, userMessage, 'user')];
            case 4:
                // Сохраняем сообщение пользователя
                _a.sent();
                return [4 /*yield*/, supabase
                        .from('messages')
                        .select('role, content')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(10)];
            case 5:
                recentMessages = (_a.sent()).data;
                // Формируем контекст для ИИ с правильными ролями
                messages = (recentMessages === null || recentMessages === void 0 ? void 0 : recentMessages.reverse().map(function (msg) { return ({
                    role: msg.role || 'user',
                    content: msg.content
                }); })) || [];
                return [3 /*break*/, 7];
            case 6:
                error_12 = _a.sent();
                console.warn('⚠️ Supabase unavailable, using cache');
                // Используем кеш из памяти
                messages = userContextCache.get(telegram_id) || [];
                return [3 /*break*/, 7];
            case 7:
                // Добавляем текущее сообщение пользователя
                messages.push({ role: 'user', content: userMessage });
                console.log('[spor3s_bot] Отправляем в AI контекст:', messages.length, 'сообщений');
                return [4 /*yield*/, callAI(userMessage, messages, user.id, telegram_id)];
            case 8:
                aiResponse = _a.sent();
                _a.label = 9;
            case 9:
                _a.trys.push([9, 11, , 12]);
                // Сохраняем ответ ИИ
                return [4 /*yield*/, saveMessage(user.id, aiResponse, 'assistant')];
            case 10:
                // Сохраняем ответ ИИ
                _a.sent();
                return [3 /*break*/, 12];
            case 11:
                error_13 = _a.sent();
                console.warn('⚠️ Failed to save message to DB');
                return [3 /*break*/, 12];
            case 12:
                // Обновляем кеш
                messages.push({ role: 'assistant', content: aiResponse });
                if (messages.length > 10) {
                    messages = messages.slice(-10);
                }
                userContextCache.set(telegram_id, messages);
                if (!(aiResponse.includes('[order_now:') || aiResponse.includes('заказ') || aiResponse.includes('оформить'))) return [3 /*break*/, 15];
                return [4 /*yield*/, buildMiniAppLink(telegram_id)];
            case 13:
                appLink = _a.sent();
                keyboard = {
                    inline_keyboard: [[
                            { text: '🛒 Открыть магазин', url: appLink }
                        ]]
                };
                return [4 /*yield*/, ctx.reply(aiResponse, { reply_markup: keyboard })];
            case 14:
                _a.sent();
                return [3 /*break*/, 18];
            case 15: return [4 /*yield*/, buildMiniAppLink(telegram_id)];
            case 16:
                appLink = _a.sent();
                return [4 /*yield*/, ctx.reply("".concat(aiResponse, "\n\n\u041E\u0444\u043E\u0440\u043C\u0438\u0442\u044C \u0432 Mini App: ").concat(appLink))];
            case 17:
                _a.sent();
                _a.label = 18;
            case 18: return [3 /*break*/, 20];
            case 19:
                error_14 = _a.sent();
                console.error('Error processing message:', error_14);
                ctx.reply('Извините, произошла ошибка. Попробуйте позже.');
                return [3 /*break*/, 20];
            case 20: return [2 /*return*/];
        }
    });
}); });
// Обработка callback запросов
bot.action('create_order', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var telegram_id, user, orderForm, error_15;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                telegram_id = ctx.from.id.toString();
                return [4 /*yield*/, getOrCreateUser(telegram_id, ctx.from)];
            case 1:
                user = _a.sent();
                orderForm = {
                    inline_keyboard: [
                        [{ text: '📝 Заполнить данные заказа', callback_data: 'order_form' }],
                        [{ text: '❌ Отмена', callback_data: 'cancel_order' }]
                    ]
                };
                return [4 /*yield*/, ctx.editMessageText('🛒 Для оформления заказа нужно заполнить данные. Нажмите кнопку ниже:', {
                        reply_markup: orderForm
                    })];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                error_15 = _a.sent();
                console.error('Error creating order form:', error_15);
                ctx.answerCbQuery('Ошибка создания формы заказа');
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
bot.action('order_form', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var error_16;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                // Здесь можно реализовать интерактивную форму заказа
                // Пока что отправляем инструкцию
                return [4 /*yield*/, ctx.editMessageText("\uD83D\uDCDD \u0414\u043B\u044F \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u044F \u0437\u0430\u043A\u0430\u0437\u0430 \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043C\u043D\u0435 \u0432 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C \u0444\u043E\u0440\u043C\u0430\u0442\u0435:\n\n\u0417\u0410\u041A\u0410\u0417:\n\u0422\u043E\u0432\u0430\u0440\u044B: [\u0441\u043F\u0438\u0441\u043E\u043A \u0442\u043E\u0432\u0430\u0440\u043E\u0432]\n\u0421\u0443\u043C\u043C\u0430: [\u0441\u0443\u043C\u043C\u0430 \u0432 \u0440\u0443\u0431\u043B\u044F\u0445]\n\u0424\u0418\u041E: [\u0432\u0430\u0448\u0435 \u0438\u043C\u044F]\n\u0422\u0435\u043B\u0435\u0444\u043E\u043D: [\u0432\u0430\u0448 \u0442\u0435\u043B\u0435\u0444\u043E\u043D]\n\u0410\u0434\u0440\u0435\u0441: [\u0430\u0434\u0440\u0435\u0441 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438]\n\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439: [\u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F]\n\n\u041F\u0440\u0438\u043C\u0435\u0440:\n\u0417\u0410\u041A\u0410\u0417:\n\u0422\u043E\u0432\u0430\u0440\u044B: \u0415\u0436\u043E\u0432\u0438\u043A 100\u0433, \u041C\u0443\u0445\u043E\u043C\u043E\u0440 30\u0433\n\u0421\u0443\u043C\u043C\u0430: 2500\n\u0424\u0418\u041E: \u0418\u0432\u0430\u043D\u043E\u0432 \u0418\u0432\u0430\u043D\n\u0422\u0435\u043B\u0435\u0444\u043E\u043D: +7 999 123-45-67\n\u0410\u0434\u0440\u0435\u0441: \u0433. \u041C\u043E\u0441\u043A\u0432\u0430, \u0443\u043B. \u041F\u0440\u0438\u043C\u0435\u0440\u043D\u0430\u044F, \u0434. 1, \u043A\u0432. 1\n\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439: \u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430 \u0434\u043E 18:00")];
            case 1:
                // Здесь можно реализовать интерактивную форму заказа
                // Пока что отправляем инструкцию
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                error_16 = _a.sent();
                console.error('Error showing order form:', error_16);
                ctx.answerCbQuery('Ошибка показа формы заказа');
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
bot.action('cancel_order', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var error_17;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, ctx.editMessageText('❌ Оформление заказа отменено. Можете продолжить общение с ИИ!')];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                error_17 = _a.sent();
                console.error('Error canceling order:', error_17);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Обработка команды заказа
bot.hears(/ЗАКАЗ:/i, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var telegram_id, user, orderText, orderData, orderResult, error_18;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                telegram_id = ctx.from.id.toString();
                return [4 /*yield*/, getOrCreateUser(telegram_id, ctx.from)];
            case 1:
                user = _a.sent();
                orderText = ctx.message.text;
                orderData = parseOrderData(orderText);
                if (!orderData) {
                    return [2 /*return*/, ctx.reply('❌ Неверный формат заказа. Используйте формат:\n\nЗАКАЗ:\nТовары: ...\nСумма: ...\nФИО: ...\nТелефон: ...\nАдрес: ...')];
                }
                return [4 /*yield*/, createOrder(user.id, orderData)];
            case 2:
                orderResult = _a.sent();
                // Уведомляем менеджера
                return [4 /*yield*/, notifyManager(orderResult.order, ctx.from)];
            case 3:
                // Уведомляем менеджера
                _a.sent();
                // Отправляем подтверждение пользователю
                return [4 /*yield*/, ctx.reply("\u2705 \u0417\u0430\u043A\u0430\u0437 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0437\u0434\u0430\u043D!\n\n\uD83D\uDCE6 \u041D\u043E\u043C\u0435\u0440 \u0437\u0430\u043A\u0430\u0437\u0430: #".concat(orderResult.order.id, "\n\uD83D\uDCB0 \u0421\u0443\u043C\u043C\u0430: ").concat(orderResult.order.total, "\u20BD\n\uD83D\uDCDE \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u0441\u0432\u044F\u0436\u0435\u0442\u0441\u044F \u0441 \u0432\u0430\u043C\u0438 \u0432 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0432\u0440\u0435\u043C\u044F.\n\n\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u0437\u0430\u043A\u0430\u0437! \uD83C\uDF44"))];
            case 4:
                // Отправляем подтверждение пользователю
                _a.sent();
                return [3 /*break*/, 6];
            case 5:
                error_18 = _a.sent();
                console.error('Error processing order:', error_18);
                ctx.reply("\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0437\u0430\u043A\u0430\u0437\u0430: ".concat(error_18 instanceof Error ? error_18.message : 'Неизвестная ошибка'));
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Функция для парсинга данных заказа
function parseOrderData(orderText) {
    try {
        var lines = orderText.split('\n');
        var orderData = {};
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            if (line.includes('Товары:')) {
                orderData.items = line.split('Товары:')[1].trim();
            }
            else if (line.includes('Сумма:')) {
                orderData.total = parseInt(line.split('Сумма:')[1].trim());
            }
            else if (line.includes('ФИО:')) {
                orderData.fio = line.split('ФИО:')[1].trim();
            }
            else if (line.includes('Телефон:')) {
                orderData.phone = line.split('Телефон:')[1].trim();
            }
            else if (line.includes('Адрес:')) {
                orderData.address = line.split('Адрес:')[1].trim();
            }
            else if (line.includes('Комментарий:')) {
                orderData.comment = line.split('Комментарий:')[1].trim();
            }
        }
        // Проверяем обязательные поля
        if (!orderData.items || !orderData.total || !orderData.fio || !orderData.phone || !orderData.address) {
            return null;
        }
        return orderData;
    }
    catch (error) {
        console.error('Error parsing order data:', error);
        return null;
    }
}
// Обработка ошибок
bot.catch(function (err, ctx) {
    console.error("Error for ".concat(ctx.updateType, ":"), err);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
});
bot.launch();
console.log('🤖 Spor3s AI Bot started successfully!');
// Graceful stop
process.once('SIGINT', function () { return bot.stop('SIGINT'); });
process.once('SIGTERM', function () { return bot.stop('SIGTERM'); });
