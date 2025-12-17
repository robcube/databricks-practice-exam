"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTopicScore = exports.validateExamResult = exports.ExamResultModel = exports.validateQuestion = exports.QuestionModel = exports.validateUser = exports.UserModel = void 0;
// Export all data models and validation functions
var User_1 = require("./User");
Object.defineProperty(exports, "UserModel", { enumerable: true, get: function () { return User_1.UserModel; } });
Object.defineProperty(exports, "validateUser", { enumerable: true, get: function () { return User_1.validateUser; } });
var Question_1 = require("./Question");
Object.defineProperty(exports, "QuestionModel", { enumerable: true, get: function () { return Question_1.QuestionModel; } });
Object.defineProperty(exports, "validateQuestion", { enumerable: true, get: function () { return Question_1.validateQuestion; } });
var ExamResult_1 = require("./ExamResult");
Object.defineProperty(exports, "ExamResultModel", { enumerable: true, get: function () { return ExamResult_1.ExamResultModel; } });
Object.defineProperty(exports, "validateExamResult", { enumerable: true, get: function () { return ExamResult_1.validateExamResult; } });
Object.defineProperty(exports, "validateTopicScore", { enumerable: true, get: function () { return ExamResult_1.validateTopicScore; } });
// Re-export shared types for convenience
__exportStar(require("../../../shared/types"), exports);
//# sourceMappingURL=index.js.map