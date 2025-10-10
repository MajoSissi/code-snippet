// ==UserScript==
// @name         Iwara 外部播放器
// @namespace    none
// @version,     1.1
// @description  支持外部播放器和链接代理
// @author       EvilSissi
// @match        *://*.iwara.tv/*
// @include      *://*/*iwara.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=iwara.tv
// @require      https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-y/pako/2.0.4/pako.min.js
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      api.iwara.tv
// @connect      files.iwara.tv
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    console.log('[Iwara Player] 脚本已启动');

    // SVG 图标（用于按钮）
    const SVG_ICONS = {
        COPY: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
        NEW_TAB: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>',
        PLAY: '<polygon points="5 3 19 12 5 21 5 3"></polygon>'
    };

    // 注入全局样式
    GM_addStyle(`
        /* ========== 浮动按钮样式 ========== */
        .iwara-mpv-fab {
            position: fixed;
            right: 30px;
            z-index: 999998;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
            user-select: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .iwara-mpv-fab:hover {
            background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            transform: translateY(-2px) scale(1.05);
        }
        .iwara-mpv-fab:active {
            transform: translateY(0) scale(0.98);
        }
        #iwara-mpv-settings-fab {
            bottom: 30px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            font-size: 24px;
        }
        #iwara-mpv-settings-fab:hover {
            transform: translateY(-2px) scale(1.1) rotate(90deg);
        }

        /* 视频播放页按钮组 - 1x4 垂直布局 */
        #iwara-mpv-button-group-detail {
            position: fixed;
            right: 30px;
            bottom: 100px;
            z-index: 999998;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        #iwara-mpv-button-group-detail button {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid;
            backdrop-filter: blur(10px);
        }
        #iwara-mpv-button-group-detail button:hover {
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            transform: translateY(-2px) scale(1.05);
        }
        #iwara-mpv-button-group-detail button:active {
            transform: translateY(0) scale(0.98);
        }
        #iwara-mpv-button-group-detail button svg {
            width: 24px;
            height: 24px;
        }
        #iwara-mpv-button-group-detail .copy-btn {
            background: rgba(255, 255, 255, 0.95);
            color: #667eea;
            border-color: #667eea;
        }
        #iwara-mpv-button-group-detail .copy-btn:hover {
            background: #667eea;
            color: #fff;
        }
        #iwara-mpv-button-group-detail .new-tab-btn {
            background: rgba(255, 255, 255, 0.95);
            color: #51cf66;
            border-color: #51cf66;
        }
        #iwara-mpv-button-group-detail .new-tab-btn:hover {
            background: #51cf66;
            color: #fff;
        }
        #iwara-mpv-button-group-detail .quality-btn {
            background: rgba(255, 255, 255, 0.95);
            color: #ffa500;
            border-color: #ffa500;
            font-size: 14px;
            font-weight: bold;
        }
        #iwara-mpv-button-group-detail .quality-btn:hover {
            background: #ffa500;
            color: #fff;
        }
        #iwara-mpv-button-group-detail .play-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            border-color: #667eea;
        }
        #iwara-mpv-button-group-detail .play-btn:hover {
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.7);
        }

        /* 悬停按钮容器 - 2x2 网格布局 */
        .iwara-mpv-button-group {
            position: absolute;
            right: 10px;
            bottom: 10px;
            z-index: 100;
            display: none;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        /* 当按钮少于4个时，改为单列布局 */
        .iwara-mpv-button-group.single-column {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
        }
        .iwara-mpv-button-group.visible {
            opacity: 1;
        }

        /* 按钮组内所有按钮的统一基础样式 */
        .iwara-mpv-button-group button {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
            opacity: 0;
            transform: scale(0.8);
            border: 2px solid;
        }
        .iwara-mpv-button-group button:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .iwara-mpv-button-group button svg {
            width: 18px;
            height: 18px;
        }

        /* 复制按钮 */
        .iwara-mpv-action-btn.copy {
            background: rgba(255, 255, 255, 0.95);
            color: #667eea;
            border-color: #667eea;
        }
        .iwara-mpv-action-btn.copy:hover {
            background: #667eea;
            color: #fff;
        }

        /* 新标签页播放按钮 */
        .iwara-mpv-action-btn.new-tab {
            background: rgba(255, 255, 255, 0.95);
            color: #51cf66;
            border-color: #51cf66;
        }
        .iwara-mpv-action-btn.new-tab:hover {
            background: #51cf66;
            color: #fff;
        }

        /* 画质按钮 */
        .iwara-mpv-action-btn.quality {
            background: rgba(255, 255, 255, 0.95);
            color: #ffa500;
            border-color: #ffa500;
            font-size: 14px;
            font-weight: bold;
        }
        .iwara-mpv-action-btn.quality:hover {
            background: #ffa500;
            color: #fff;
        }

        /* 播放按钮 */
        .iwara-mpv-button-group .iwara-mpv-hover-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            border-color: #667eea;
        }
        .iwara-mpv-button-group .iwara-mpv-hover-button:hover {
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.7);
        }
        .iwara-mpv-button-group .iwara-mpv-hover-button svg {
            width: 20px;
            height: 20px;
        }

        /* ========== 统一表单输入框样式 ========== */
        .iwara-form-input,
        .iwara-form-textarea {
            width: 100%;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #e0e0e0;
            font-size: 14px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            transition: all 0.2s;
            box-sizing: border-box;
        }
        .iwara-form-input:focus,
        .iwara-form-textarea:focus {
            outline: none;
            border-color: #667eea;
            background: rgba(255, 255, 255, 0.08);
        }
        .iwara-form-input::placeholder,
        .iwara-form-textarea::placeholder {
            color: #666;
        }
        .iwara-form-textarea {
            resize: vertical;
            min-height: 80px;
            line-height: 1.5;
        }

        /* ========== 按钮设置复选框样式 ========== */
        .iwara-button-settings-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
        .iwara-checkbox-label {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 2px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            user-select: none;
        }
        .iwara-checkbox-label:hover {
            background: rgba(102, 126, 234, 0.1);
            border-color: rgba(102, 126, 234, 0.3);
        }
        .iwara-checkbox-label input[type="checkbox"] {
            appearance: none;
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.3);
            cursor: pointer;
            position: relative;
            transition: all 0.2s;
            flex-shrink: 0;
        }
        .iwara-checkbox-label input[type="checkbox"]:hover {
            border-color: #667eea;
        }
        .iwara-checkbox-label input[type="checkbox"]:checked {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-color: #667eea;
        }
        .iwara-checkbox-label input[type="checkbox"]:checked::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
        }
        .iwara-checkbox-label span {
            color: #94a3b8;
            font-size: 13px;
            font-weight: 500;
            transition: color 0.2s;
        }
        .iwara-checkbox-label:hover span {
            color: #cbd5e1;
        }
        .iwara-checkbox-label input[type="checkbox"]:checked + span {
            color: #e2e8f0;
        }
        .iwara-settings-subsection {
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
        }
        .iwara-settings-subsection:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        .iwara-settings-subsection h5 {
            color: #cbd5e1;
            margin: 0 0 10px 0;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .iwara-settings-section-title {
            color: #e2e8f0;
            margin: -4px 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 12px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
        .iwara-settings-section {
            padding: 20px;
            margin-bottom: 16px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .iwara-settings-section:last-child {
            margin-bottom: 0;
        }
        .iwara-settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: -4px 0 14px 0;
        }
        .iwara-settings-header h4 {
            color: #e2e8f0;
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        /* ========== 新设计的模态框样式 ========== */
        .iwara-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .iwara-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        /* 新设计：左右分栏容器 */
        .iwara-modal-content {
            background: #1a1d2e;
            border-radius: 10px;
            width: 900px;
            max-width: 1100px;
            height: 85vh;
            max-height: 750px;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7);
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        @keyframes slideUp {
            from { transform: translateY(40px) scale(0.95); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
        }
        

        
        /* 主容器 */
        .iwara-modal-main {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        /* 左侧边栏 */
        .iwara-modal-sidebar {
            width: 200px;
            background: #15172b;
            border-right: 1px solid rgba(255, 255, 255, 0.06);
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        }
        
        
        /* 播放器列表 */
        .iwara-sidebar-players {
            flex: 1;
            padding: 16px 12px;
            overflow-y: auto;
        }
        .iwara-sidebar-player-item {
            display: flex;
            align-items: center;
            padding: 12px 14px;
            margin-bottom: 6px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
        }
        .iwara-sidebar-player-item:hover {
            background: rgba(102, 126, 234, 0.08);
            border-color: rgba(102, 126, 234, 0.2);
        }
        .iwara-sidebar-player-item.active {
            background: rgba(102, 126, 234, 0.15);
            border-color: rgba(102, 126, 234, 0.4);
        }
        .iwara-sidebar-player-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
        }
        .iwara-sidebar-player-icon img {
            width: 28px;
            height: 28px;
            object-fit: contain;
        }
        .iwara-sidebar-player-info {
            flex: 1;
            min-width: 0;
        }
        .iwara-sidebar-player-name {
            font-size: 14px;
            font-weight: 500;
            color: #e2e8f0;
            margin: 0 0 2px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .iwara-sidebar-player-desc {
            font-size: 11px;
            color: #64748b;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* 左侧底部 - 设置 */
        .iwara-sidebar-footer {
            padding: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            background: rgba(0, 0, 0, 0.2);
            height: 86px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
        }
        .iwara-sidebar-main-settings {
            display: flex;
            align-items: center;
            width: 100%;
            padding: 12px;
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.25);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .iwara-sidebar-main-settings:hover {
            background: rgba(102, 126, 234, 0.15);
            border-color: rgba(102, 126, 234, 0.35);
        }
        .iwara-sidebar-main-settings.active {
            background: rgba(102, 126, 234, 0.2);
            border-color: rgba(102, 126, 234, 0.5);
        }
        .iwara-sidebar-main-icon {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
            font-size: 18px;
            background: rgba(102, 126, 234, 0.15);
            border-radius: 8px;
            color: #818cf8;
        }
        .iwara-sidebar-main-text {
            font-size: 13px;
            font-weight: 500;
            color: #c7d2fe;
        }
        
        /* 右侧内容区 */
        .iwara-modal-content-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        /* 内容顶部标题栏 */
        .iwara-content-header {
            padding: 20px 32px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            background: rgba(0, 0, 0, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 70px;
        }
        .iwara-content-title {
            font-size: 18px;
            font-weight: 600;
            color: #e2e8f0;
            margin: 0;
            line-height: 1.4;
        }
        #header-action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .iwara-btn-delete-player {
            padding: 8px 18px;
            background: rgba(255, 59, 48, 0.15);
            border: 1px solid rgba(255, 59, 48, 0.4);
            border-radius: 8px;
            color: #ff3b30;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
        .iwara-btn-delete-player:hover {
            background: rgba(255, 59, 48, 0.25);
            border-color: rgba(255, 59, 48, 0.6);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
        }
        .iwara-btn-create-player {
            padding: 8px 18px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
        .iwara-btn-create-player:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        /* 内容主体 */
        .iwara-content-body {
            flex: 1;
            padding: 24px 28px;
            overflow-y: auto;
        }
        
        /* 内容底部 - 按钮区 */
        .iwara-content-footer {
            padding: 16px 32px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            background: rgba(0, 0, 0, 0.2);
            height: 86px;
            box-sizing: border-box;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .iwara-footer-hint {
            flex: 1;
            display: flex;
            align-items: center;
        }
        .iwara-footer-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .iwara-btn {
            padding: 10px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .iwara-btn-cancel {
            background: rgba(255, 255, 255, 0.1);
            color: #e0e0e0;
        }
        .iwara-btn-cancel:hover {
            background: rgba(255, 255, 255, 0.15);
        }
        .iwara-btn-secondary {
            background: rgba(102, 126, 234, 0.2);
            border: 2px solid rgba(102, 126, 234, 0.5);
            color: #667eea;
        }
        .iwara-btn-secondary:hover {
            background: rgba(102, 126, 234, 0.3);
            border-color: #667eea;
            transform: translateY(-2px);
        }
        .iwara-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
        }
        .iwara-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .iwara-btn-small {
            padding: 6px 14px;
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.4);
            border-radius: 6px;
            color: #667eea;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .iwara-btn-small:hover {
            background: rgba(102, 126, 234, 0.3);
            border-color: #667eea;
        }

        /* ========== 设置页面专用样式 ========== */
        .iwara-settings-section {
            margin-bottom: 28px;
        }
        .iwara-settings-section:last-child {
            margin-bottom: 0;
        }
        .iwara-settings-section h3 {
            margin: 0 0 16px 0;
            color: #e0e0e0;
            font-size: 16px;
            font-weight: 600;
        }
        .iwara-hint {
            margin: 8px 0 0 0;
            color: #999;
            font-size: 12px;
        }

        /* 播放器选项 */
        .iwara-player-options {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .iwara-player-option {
            position: relative;
            display: flex;
            align-items: center;
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .iwara-player-option:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(102, 126, 234, 0.5);
        }
        .iwara-player-option.active {
            background: rgba(102, 126, 234, 0.15);
            border-color: #667eea;
        }
        .iwara-player-option input[type="radio"] {
            margin-right: 12px;
            cursor: pointer;
        }
        .iwara-option-icon {
            font-size: 24px;
            margin-right: 12px;
        }
        .iwara-option-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .iwara-option-text strong {
            color: #e0e0e0;
            font-size: 14px;
        }
        .iwara-option-text small {
            color: #999;
            font-size: 12px;
        }
        .iwara-player-actions {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            gap: 8px;
            z-index: 10;
        }
        .iwara-edit-btn,
        .iwara-delete-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            opacity: 0.8;
        }
        .iwara-edit-btn:hover {
            background: rgba(102, 126, 234, 0.3);
            border-color: rgba(102, 126, 234, 0.6);
            opacity: 1;
            transform: scale(1.1);
        }
        .iwara-delete-btn {
            background: rgba(255, 59, 48, 0.15);
            border-color: rgba(255, 59, 48, 0.4);
        }
        .iwara-delete-btn:hover {
            background: rgba(255, 59, 48, 0.3);
            border-color: rgba(255, 59, 48, 0.6);
            opacity: 1;
            transform: scale(1.1);
        }

        /* 画质选项 */
        .iwara-quality-options {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .iwara-quality-option {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .iwara-quality-option:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(102, 126, 234, 0.5);
        }
        .iwara-quality-option.active {
            background: rgba(102, 126, 234, 0.15);
            border-color: #667eea;
        }
        .iwara-quality-option input[type="radio"] {
            margin-right: 12px;
            cursor: pointer;
        }

        /* 代理列表 */
        .iwara-proxy-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 200px;
            overflow-y: auto;
            padding: 4px;
        }
        .iwara-proxy-list::-webkit-scrollbar {
            width: 6px;
        }
        .iwara-proxy-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }
        .iwara-proxy-list::-webkit-scrollbar-thumb {
            background: rgba(102, 126, 234, 0.5);
            border-radius: 3px;
        }
        .iwara-proxy-list::-webkit-scrollbar-thumb:hover {
            background: rgba(102, 126, 234, 0.7);
        }

        /* ========== 统一滚动条样式 ========== */
        .iwara-modal-sidebar::-webkit-scrollbar,
        .iwara-sidebar-players::-webkit-scrollbar,
        .iwara-content-body::-webkit-scrollbar {
            width: 8px;
        }
        .iwara-modal-sidebar::-webkit-scrollbar-track,
        .iwara-sidebar-players::-webkit-scrollbar-track,
        .iwara-content-body::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 4px;
            margin: 4px 0;
        }
        .iwara-modal-sidebar::-webkit-scrollbar-thumb,
        .iwara-sidebar-players::-webkit-scrollbar-thumb,
        .iwara-content-body::-webkit-scrollbar-thumb {
            background: rgba(102, 126, 234, 0.4);
            border-radius: 4px;
            border: 2px solid transparent;
            background-clip: padding-box;
            transition: background 0.2s;
        }
        .iwara-modal-sidebar::-webkit-scrollbar-thumb:hover,
        .iwara-sidebar-players::-webkit-scrollbar-thumb:hover,
        .iwara-content-body::-webkit-scrollbar-thumb:hover {
            background: rgba(102, 126, 234, 0.6);
            background-clip: padding-box;
        }
        .iwara-modal-sidebar::-webkit-scrollbar-thumb:active,
        .iwara-sidebar-players::-webkit-scrollbar-thumb:active,
        .iwara-content-body::-webkit-scrollbar-thumb:active {
            background: rgba(102, 126, 234, 0.8);
            background-clip: padding-box;
        }
        
        .iwara-proxy-item {
            display: flex;
            align-items: center;
            padding: 10px 14px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            transition: all 0.2s;
            gap: 10px;
        }
        .iwara-proxy-item:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(102, 126, 234, 0.3);
        }
        .iwara-proxy-item.disabled {
            opacity: 0.5;
        }
        .iwara-proxy-item .proxy-url {
            flex: 1;
            color: #e0e0e0;
            font-size: 13px;
            font-family: 'Consolas', 'Monaco', monospace;
            word-break: break-all;
        }
        .iwara-proxy-item.disabled .proxy-url {
            color: #999;
            text-decoration: line-through;
        }
        .iwara-proxy-status {
            padding: 4px 10px;
            border: 1px solid;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            min-width: 70px;
            text-align: center;
        }
        .iwara-proxy-status.checking {
            background: rgba(102, 126, 234, 0.2);
            border-color: rgba(102, 126, 234, 0.4);
            color: #667eea;
        }
        .iwara-proxy-status.success {
            background: rgba(81, 207, 102, 0.2);
            border-color: rgba(81, 207, 102, 0.4);
            color: #51cf66;
        }
        .iwara-proxy-status.failed {
            background: rgba(255, 107, 107, 0.2);
            border-color: rgba(255, 107, 107, 0.4);
            color: #ff6b6b;
        }
        .iwara-proxy-status.slow {
            background: rgba(255, 165, 0, 0.2);
            border-color: rgba(255, 165, 0, 0.4);
            color: #ffa500;
        }
        .iwara-proxy-toggle {
            padding: 4px 12px;
            background: rgba(81, 207, 102, 0.2);
            border: 1px solid rgba(81, 207, 102, 0.4);
            border-radius: 6px;
            color: #51cf66;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }
        .iwara-proxy-toggle:hover {
            background: rgba(81, 207, 102, 0.3);
            border-color: #51cf66;
            transform: scale(1.05);
        }
        .iwara-proxy-toggle.disabled {
            background: rgba(255, 107, 107, 0.2);
            border-color: rgba(255, 107, 107, 0.4);
            color: #ff6b6b;
        }
        .iwara-proxy-toggle.disabled:hover {
            background: rgba(255, 107, 107, 0.3);
            border-color: #ff6b6b;
        }
        .iwara-proxy-delete {
            padding: 4px 8px;
            background: rgba(255, 59, 48, 0.15);
            border: 1px solid rgba(255, 59, 48, 0.4);
            border-radius: 6px;
            color: #ff3b30;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            line-height: 1;
        }
        .iwara-proxy-delete:hover {
            background: rgba(255, 59, 48, 0.3);
            border-color: #ff3b30;
            transform: scale(1.1);
        }

        /* Select 下拉框样式 */
        select.iwara-form-input {
            cursor: pointer;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
        }
        select.iwara-form-input:hover {
            border-color: rgba(102, 126, 234, 0.5);
        }
        select.iwara-form-input option {
            background: #1a1a2e;
            color: #e0e0e0;
            padding: 10px;
        }
        select.iwara-form-input option:hover {
            background: #667eea;
        }
    `);

    // 代理列表（数组格式：[{url: '', enabled: true}, ...]）
    let proxyList = GM_getValue('proxyList', []);

    // 代理检测超时时间（毫秒）
    let proxyTimeout = GM_getValue('proxyTimeout', 10000);

    // 外部播放器名称
    let externalPlayer = GM_getValue('externalPlayer', 'MPV');

    // 视频画质设置 - 固定为 Source
    const videoQuality = 'Source';

    // 按钮显示设置
    let buttonSettings = GM_getValue('buttonSettings', {
        detailPage: {
            copy: true,
            newTab: true,
            quality: true,
            play: true
        },
        listPage: {
            copy: true,
            newTab: true,
            quality: true,
            play: true
        }
    });

    // 默认播放器列表
    const defaultPlayers = [
        {
            name: "MPV",
            icon: "data:image/png;base64,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",
            description: "MPV + ush",
            type: "ush",
            appName: "MPV",
            args: ["${url}", "--force-media-title=${title}", "--ontop"]
        },
        {
            name: "PotPlayer",
            icon: "data:image/png;base64,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",
            description: "PotPlayer 标准协议",
            type: "protocol",
            protocol: "potplayer://${url}"
        },
        {
            name: "VLC",
            icon: "data:image/png;base64,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",
            description: "VLC 标准协议",
            type: "protocol",
            protocol: "vlc://${url}"
        }
    ];

    // 自定义播放器列表
    let customPlayers = GM_getValue('customPlayers', []);

    // 标记是否已初始化过默认播放器
    const hasInitializedDefaults = GM_getValue('hasInitializedDefaults', false);

    // 仅在首次安装时添加默认播放器
    if (!hasInitializedDefaults && customPlayers.length === 0) {
        customPlayers = [...defaultPlayers];
        GM_setValue('customPlayers', customPlayers);
        GM_setValue('hasInitializedDefaults', true);
    }

    // 恢复默认播放器列表的函数
    function resetToDefaultPlayers() {
        if (confirm('确定要恢复默认播放器列表吗？\n这将清除所有自定义播放器并恢复为 MPV、PotPlayer、VLC。')) {
            customPlayers = [...defaultPlayers];
            GM_setValue('customPlayers', customPlayers);
            externalPlayer = 'MPV';
            GM_setValue('externalPlayer', externalPlayer);
            showNotification('✅ 已恢复默认播放器列表', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    }

    // 代理地址补全和验证
    function normalizeProxyUrl(url) {
        if (!url || url.trim() === '') {
            return '';
        }

        url = url.trim();

        // 检查是否包含协议
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        // 检查是否以 / 结尾
        if (!url.endsWith('/')) {
            url = url + '/';
        }

        // 验证URL格式
        try {
            new URL(url);
            return url;
        } catch (e) {
            return null;
        }
    }

    // 从启用的代理中随机选择一个并应用到视频URL
    function getProxiedUrl(videoUrl) {
        // 检查当前域名是否为 iwara.tv
        const currentHostname = window.location.hostname;
        const isIwaraDomain = currentHostname === 'iwara.tv' || currentHostname === 'www.iwara.tv' || currentHostname.endsWith('.iwara.tv');

        // 如果不是 iwara.tv 域名，使用当前访问的代理前缀
        if (!isIwaraDomain) {
            const currentProxy = getCurrentProxyPrefix();
            if (currentProxy) {
                const proxiedUrl = currentProxy + videoUrl;
                console.log(`%c[Iwara Player] 代理信息`, 'color: #ffa500; font-weight: bold;',
                    `\n当前域名: ${currentHostname}`,
                    '\n使用当前代理前缀:',
                    '\n代理地址:', currentProxy,
                    '\n代理后URL:', proxiedUrl);
                return proxiedUrl;
            } else {
                console.log(`%c[Iwara Player] 代理信息`, 'color: #ffa500; font-weight: bold;',
                    `\n当前域名: ${currentHostname}`,
                    '\n非 iwara.tv 域名且无法检测代理，返回原始URL');
                return videoUrl;
            }
        }

        // 在 iwara.tv 域名下，使用设置中的代理列表
        const enabledProxies = proxyList.filter(p => p.enabled);

        if (enabledProxies.length === 0) {
            return videoUrl;
        }

        const randomIndex = Math.floor(Math.random() * enabledProxies.length);
        const selectedProxy = enabledProxies[randomIndex];
        const proxiedUrl = selectedProxy.url + videoUrl;

        console.log(`%c[Iwara Player] 代理信息`, 'color: #ffa500; font-weight: bold;',
            `\n当前域名: ${currentHostname}`,
            `\n已选择代理: (${randomIndex + 1}/${enabledProxies.length})`,
            '\n代理地址:', selectedProxy.url,
            '\n代理后URL:', proxiedUrl);

        return proxiedUrl;
    }

    // 获取当前代理前缀（用于 API 请求）
    function getCurrentProxyPrefix() {
        const currentHostname = window.location.hostname;
        const isIwaraDomain = currentHostname.endsWith('.iwara.tv');

        // 如果是 iwara.tv 域名，不需要代理前缀
        if (isIwaraDomain) {
            return '';
        }

        // 如果是通过代理网站访问，提取代理前缀
        const currentUrl = window.location.href;
        const match = currentUrl.match(/^(https?:\/\/[^\/]+)\//);

        if (match) {
            const pureProxy = match[1] + '/';

            console.log(`%c[Iwara Player] API 代理`, 'color: #ffa500; font-weight: bold;',
                `\n当前域名: ${currentHostname}`,
                `\n检测到代理访问，API 请求将使用代理: ${pureProxy}`);

            return pureProxy;
        }

        console.warn(`%c[Iwara Player] API 代理`, 'color: #ff6b6b; font-weight: bold;',
            `\n当前域名: ${currentHostname}`,
            '\n无法检测代理前缀，API 请求可能失败');

        return '';
    }

    // 获取所有可用播放器
    function getAllPlayers() {
        return customPlayers;
    }

    // 根据名称查找播放器
    function getPlayerByName(playerName) {
        return customPlayers.find(p => p.name === playerName);
    }

    // 刷新设置弹窗中的播放器列表
    function refreshPlayerList() {
        const settingsModal = document.getElementById('iwara-mpv-settings-modal');
        if (!settingsModal) return;

        const playerOptionsContainer = settingsModal.querySelector('.iwara-player-options');
        if (!playerOptionsContainer) return;

        const allPlayers = getAllPlayers();
        const playerOptionsHtml = [];

        allPlayers.forEach(player => {
            const isActive = externalPlayer === player.name ? 'active' : '';
            const isChecked = externalPlayer === player.name ? 'checked' : '';
            const deleteBtn = `<button class="iwara-delete-btn" data-player-name="${player.name}" title="删除此播放器" onclick="event.preventDefault(); event.stopPropagation();">❌</button>`;
            const editBtn = `<button class="iwara-edit-btn" data-player-name="${player.name}" title="编辑此播放器" onclick="event.preventDefault(); event.stopPropagation();">✏️</button>`;

            const iconHtml = player.icon && player.icon.startsWith('data:image')
                ? `<img src="${player.icon}" alt="${player.name}" style="width: 24px; height: 24px; object-fit: contain;">`
                : (player.icon || '🎮');

            playerOptionsHtml.push(`
                <label class="iwara-player-option ${isActive}">
                    <input type="radio" name="player" value="${player.name}" ${isChecked}>
                    <span class="iwara-option-icon">${iconHtml}</span>
                    <span class="iwara-option-text">
                        <strong>${player.name}</strong>
                        <small>${player.description || '自定义播放器'}</small>
                    </span>
                    <div class="iwara-player-actions">
                        ${editBtn}
                        ${deleteBtn}
                    </div>
                </label>
            `);
        });

        playerOptionsContainer.innerHTML = playerOptionsHtml.join('');

        // 重新绑定删除和编辑按钮事件
        bindPlayerActionEvents(settingsModal);
    }

    // 绑定播放器操作按钮事件（删除、编辑）
    function bindPlayerActionEvents(modal) {
        // 删除按钮
        modal.querySelectorAll('.iwara-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const playerName = btn.dataset.playerName;
                const player = getPlayerByName(playerName);

                let confirmMessage = `确定要删除"${player.name}"吗？`;
                const isDefaultPlayer = defaultPlayers.some(dp => dp.name === playerName);
                if (isDefaultPlayer) {
                    confirmMessage += '\n\n⚠️ 这是预设播放器，删除后可点击 🔄 重置';
                }

                if (confirm(confirmMessage)) {
                    // 过滤掉要删除的播放器
                    customPlayers = customPlayers.filter(p => p.name !== playerName);
                    GM_setValue('customPlayers', customPlayers);

                    // 如果删除的是当前选中的播放器
                    if (externalPlayer === playerName) {
                        // 到第一个可用播放器
                        if (customPlayers.length > 0) {
                            externalPlayer = customPlayers[0].name;
                            GM_setValue('externalPlayer', externalPlayer);
                        } else {
                            // 如果没有播放器了，使用默认MPV
                            externalPlayer = 'MPV';
                            GM_setValue('externalPlayer', externalPlayer);
                        }
                    }

                    showNotification(`✅ 已删除"${player.name}"`, 'success');
                    refreshPlayerList();
                }
            });
        });

        // 编辑按钮
        modal.querySelectorAll('.iwara-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const playerName = btn.dataset.playerName;
                const player = getPlayerByName(playerName);
                if (player) {
                    createEditPlayerModal(player);
                }
            });
        });
    }

    // 创建设置弹窗 - 全新左右分栏设计
    function createSettingsModal() {
        // 移除已存在的弹窗
        const existingModal = document.getElementById('iwara-mpv-settings-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 创建临时数据副本（关闭不保存时不会影响原始数据）
        let tempPlayers = JSON.parse(JSON.stringify(customPlayers)); // 临时播放器列表
        let currentView = 'main-settings'; // 默认打开设置
        let currentDefaultPlayer = externalPlayer; // 临时存储的默认播放器
        let tempProxyList = JSON.parse(JSON.stringify(proxyList)); // 临时代理列表
        let tempButtonSettings = JSON.parse(JSON.stringify(buttonSettings)); // 临时按钮设置
        let tempProxyTimeout = proxyTimeout; // 临时代理超时时间
        let editingPlayer = null; // 当前编辑的播放器

        // 创建弹窗容器
        const modal = document.createElement('div');
        modal.id = 'iwara-mpv-settings-modal';
        modal.className = 'iwara-modal';

        modal.innerHTML = `
            <div class="iwara-modal-overlay">
                <div class="iwara-modal-content">
                    <!-- 主容器 -->
                    <div class="iwara-modal-main">
                        <!-- 左侧边栏 -->
                        <div class="iwara-modal-sidebar">
                            <!-- 播放器列表 -->
                            <div class="iwara-sidebar-players" id="player-list"></div>
                            
                            <!-- 底部 - 设置 -->
                            <div class="iwara-sidebar-footer">
                                <div class="iwara-sidebar-main-settings" data-view="main-settings">
                                    <div class="iwara-sidebar-main-icon">🎛️</div>
                                    <div class="iwara-sidebar-main-text">设置</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 右侧内容区 -->
                        <div class="iwara-modal-content-area">
                            <!-- 内容顶部标题栏 -->
                            <div class="iwara-content-header" id="content-header" style="display: none;">
                                <h3 class="iwara-content-title" id="content-title"></h3>
                                <div id="header-action-buttons">
                                    <button class="iwara-btn-create-player" id="btn-create-player" style="display: none;">✓ 创建</button>
                                    <button class="iwara-btn-delete-player" id="btn-delete-player" style="display: none;">🗑️ 删除</button>
                                </div>
                            </div>
                            
                            <!-- 内容主体 -->
                            <div class="iwara-content-body" id="content-body">
                                <p style="color: #64748b; text-align: center; margin-top: 100px;">👈 请从左侧选择一个播放器或设置</p>
                            </div>
                            
                            <!-- 内容底部 - 按钮区 -->
                            <div class="iwara-content-footer">
                                <div class="iwara-footer-hint">
                                    <span style="color: #94a3b8; font-size: 13px;">💡 提示：若保存设置未生效，请手动刷新页面</span>
                                </div>
                                <div class="iwara-footer-buttons">
                                    <button class="iwara-btn iwara-btn-cancel" id="btn-close">✕ 关闭</button>
                                    <button class="iwara-btn iwara-btn-primary" id="btn-save">💾 保存</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 渲染左侧播放器列表
        function renderPlayerList() {
            const playerListContainer = modal.querySelector('#player-list');
            playerListContainer.innerHTML = '';

            tempPlayers.forEach(player => {
                const item = document.createElement('div');
                item.className = 'iwara-sidebar-player-item';
                item.dataset.playerName = player.name;
                if (currentView === player.name) {
                    item.classList.add('active');
                }

                const iconHtml = player.icon && player.icon.startsWith('data:image')
                    ? `<img src="${player.icon}" alt="${player.name}">`
                    : (player.icon || '🎮');

                item.innerHTML = `
                    <div class="iwara-sidebar-player-icon">${iconHtml}</div>
                    <div class="iwara-sidebar-player-info">
                        <p class="iwara-sidebar-player-name">${player.name}</p>
                    </div>
                `;

                item.addEventListener('click', () => {
                    currentView = player.name;
                    editingPlayer = player.name;
                    updateView();
                });

                playerListContainer.appendChild(item);
            });

            // 添加"添加"按钮
            const addPlayerItem = document.createElement('div');
            addPlayerItem.className = 'iwara-sidebar-player-item iwara-sidebar-add-player';
            if (currentView === 'add-player') {
                addPlayerItem.classList.add('active');
            }
            addPlayerItem.innerHTML = `
                <div class="iwara-sidebar-player-icon"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiM2NjdlZWEiIHJ4PSI0Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTE2IDhWMjRNOCAxNkgyNCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==" alt="添加"></div>
                <div class="iwara-sidebar-player-info">
                    <p class="iwara-sidebar-player-name">添加</p>
                </div>
            `;
            addPlayerItem.addEventListener('click', () => {
                currentView = 'add-player';
                editingPlayer = null;
                updateView();
            });
            playerListContainer.appendChild(addPlayerItem);
        }

        // 更新视图
        function updateView() {
            // 更新左侧选中状态
            modal.querySelectorAll('.iwara-sidebar-player-item').forEach(item => {
                if (item.classList.contains('iwara-sidebar-add-player')) {
                    item.classList.toggle('active', currentView === 'add-player');
                } else {
                    item.classList.toggle('active', item.dataset.playerName === currentView);
                }
            });
            modal.querySelector('.iwara-sidebar-main-settings').classList.toggle('active', currentView === 'main-settings');

            // 获取标题栏元素
            const contentHeader = modal.querySelector('#content-header');
            const contentTitle = modal.querySelector('#content-title');
            const deleteButton = modal.querySelector('#btn-delete-player');
            const createButton = modal.querySelector('#btn-create-player');

            // 更新右侧内容
            if (currentView === 'main-settings') {
                contentHeader.style.display = 'none';
                renderMainSettings();
            } else if (currentView === 'add-player') {
                contentHeader.style.display = 'flex';
                contentTitle.textContent = '➕ 添加';
                deleteButton.style.display = 'none';
                createButton.style.display = 'block';
                renderAddPlayerForm();
            } else {
                const player = tempPlayers.find(p => p.name === currentView);
                if (player) {
                    contentHeader.style.display = 'flex';
                    contentTitle.textContent = `✏️ 编辑`;
                    deleteButton.style.display = 'block';
                    createButton.style.display = 'none';
                    renderPlayerEditForm(player);
                }
            }
        }

        // 通用播放器表单渲染函数
        function renderPlayerForm(isEditMode, player = null) {
            const isProtocol = player ? player.type === 'protocol' : true;
            const protocolDisplay = isProtocol ? 'block' : 'none';
            const ushDisplay = isProtocol ? 'none' : 'block';
            const prefix = isEditMode ? 'edit' : 'new';

            return `
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">播放器名称</label>
                    <input type="text" id="${prefix}-player-name" value="${player ? player.name : ''}" class="iwara-form-input" placeholder="例如: PotPlayer">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">协议类型</label>
                    <select id="${prefix}-protocol-type" class="iwara-form-input">
                        <option value="protocol" ${isProtocol ? 'selected' : ''}>标准协议</option>
                        <option value="ush" ${!isProtocol ? 'selected' : ''}>USH协议</option>
                    </select>
                </div>
                
                <div id="${prefix}-protocol-group" style="margin-bottom: 20px; display: ${protocolDisplay};">
                    <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">协议链接参数</label>
                    <input type="text" id="${prefix}-protocol" value="${player && player.protocol ? player.protocol : ''}" class="iwara-form-input" placeholder="例如: potplayer://\${url}">
                    <p style="color: #64748b; font-size: 12px; margin: 6px 0 0 0;">可用参数: \${title} 标题 | \${url} 原始链接 | \${url:base64} base64编码 | \${url:encode} url编码</p>
                </div>
                
                <div id="${prefix}-ush-group" style="display: ${ushDisplay};">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">应用名称</label>
                        <input type="text" id="${prefix}-ush-app" value="${player && player.appName ? player.appName : ''}" class="iwara-form-input" placeholder="例如: MPV (和ush工具配置的名称要完全一致)">
                        <p class="iwara-hint"><a href="https://github.com/LuckyPuppy514/url-scheme-handler" target="_blank" style="color: #667eea;">⭐ ush工具 - LuckyPuppy514/url-scheme-handler</a></p>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">启动参数 (可选)</label>
                        <textarea id="${prefix}-ush-args" class="iwara-form-textarea" rows="4" placeholder="每行一个参数，例如:\n--ontop\n--fullscreen">${player && player.args ? player.args.join('\n') : ''}</textarea>
                        <p style="color: #64748b; font-size: 12px; margin: 6px 0 0 0;">可用参数: \${title} 标题 | \${url} 原始链接 | \${url:base64} base64编码 | \${url:encode} url编码</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #94a3b8; font-size: 13px; margin-bottom: 8px;">图标 (Base64 Data URL)</label>
                    <textarea id="${prefix}-player-icon" class="iwara-form-textarea" rows="3" placeholder="data:image/png;base64,iVBORw0KGgoAAAANS...">${player && player.icon ? player.icon : ''}</textarea>
                    <p style="color: #64748b; font-size: 12px; margin: 6px 0 0 0;">支持 data:image/png、data:image/svg+xml 等格式</p>
                </div>
            `;
        }

        // 设置协议类型切换逻辑
        function setupProtocolTypeToggle(prefix) {
            const contentBody = modal.querySelector('#content-body');
            const protocolTypeSelect = contentBody.querySelector(`#${prefix}-protocol-type`);
            const protocolGroup = contentBody.querySelector(`#${prefix}-protocol-group`);
            const ushGroup = contentBody.querySelector(`#${prefix}-ush-group`);

            if (protocolTypeSelect) {
                protocolTypeSelect.addEventListener('change', () => {
                    if (protocolTypeSelect.value === 'protocol') {
                        protocolGroup.style.display = 'block';
                        ushGroup.style.display = 'none';
                    } else {
                        protocolGroup.style.display = 'none';
                        ushGroup.style.display = 'block';
                    }
                });
            }
        }

        // 渲染播放器编辑表单
        function renderPlayerEditForm(player) {
            const contentBody = modal.querySelector('#content-body');

            const originalName = player.name;

            contentBody.innerHTML = renderPlayerForm(true, player);

            // 设置协议类型切换
            setupProtocolTypeToggle('edit');

            // 实时更新播放器数据
            const inputs = [
                contentBody.querySelector('#edit-player-name'),
                contentBody.querySelector('#edit-protocol-type'),
                contentBody.querySelector('#edit-protocol'),
                contentBody.querySelector('#edit-ush-app'),
                contentBody.querySelector('#edit-ush-args'),
                contentBody.querySelector('#edit-player-icon')
            ];

            inputs.forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        const name = contentBody.querySelector('#edit-player-name').value.trim();
                        const type = contentBody.querySelector('#edit-protocol-type').value;
                        const icon = contentBody.querySelector('#edit-player-icon').value.trim();

                        // 更新播放器对象
                        const playerIndex = tempPlayers.findIndex(p => p.name === originalName);
                        if (playerIndex !== -1) {
                            tempPlayers[playerIndex].name = name;
                            tempPlayers[playerIndex].type = type;
                            tempPlayers[playerIndex].icon = icon;

                            if (type === 'protocol') {
                                tempPlayers[playerIndex].protocol = contentBody.querySelector('#edit-protocol').value.trim();
                                delete tempPlayers[playerIndex].appName;
                                delete tempPlayers[playerIndex].args;
                            } else {
                                tempPlayers[playerIndex].appName = contentBody.querySelector('#edit-ush-app').value.trim();
                                const args = contentBody.querySelector('#edit-ush-args').value.trim();
                                tempPlayers[playerIndex].args = args ? args.split('\n').map(a => a.trim()).filter(a => a) : ['{url}'];
                                delete tempPlayers[playerIndex].protocol;
                            }
                        }

                        // 更新标题栏的播放器名称
                        const contentTitle = modal.querySelector('#content-title');
                        if (contentTitle && name) {
                            contentTitle.textContent = `✏️ 编辑播放器: ${name}`;
                        }
                    });
                }
            });

            // 删除按钮事件 - 绑定到标题栏的删除按钮
            const deleteButton = modal.querySelector('#btn-delete-player');
            // 移除之前的事件监听器（如果有）
            const newDeleteButton = deleteButton.cloneNode(true);
            deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);

            newDeleteButton.addEventListener('click', () => {
                let confirmMessage = `确定要删除"${player.name}"吗？`;

                if (confirm(confirmMessage)) {
                    const index = tempPlayers.findIndex(p => p.name === originalName);
                    if (index !== -1) {
                        tempPlayers.splice(index, 1);
                    }

                    if (currentDefaultPlayer === originalName) {
                        currentDefaultPlayer = tempPlayers.length > 0 ? tempPlayers[0].name : 'MPV';
                    }

                    currentView = 'main-settings';
                    renderPlayerList();
                    updateView();
                    showNotification(`✅ 已删除"${player.name}"`, 'success');
                }
            });
        }

        // 渲染添加表单
        function renderAddPlayerForm() {
            const contentBody = modal.querySelector('#content-body');

            contentBody.innerHTML = renderPlayerForm(false);

            // 设置协议类型切换
            setupProtocolTypeToggle('new');

            // 添加按钮事件 - 绑定到标题栏的创建按钮
            const createButton = modal.querySelector('#btn-create-player');
            // 移除之前的事件监听器（如果有）
            const newCreateButton = createButton.cloneNode(true);
            createButton.parentNode.replaceChild(newCreateButton, createButton);

            newCreateButton.addEventListener('click', () => {
                const name = contentBody.querySelector('#new-player-name').value.trim();
                const type = contentBody.querySelector('#new-protocol-type').value;
                const icon = contentBody.querySelector('#new-player-icon').value.trim();

                if (!name) {
                    showNotification('❌ 请输入播放器名称', 'error');
                    return;
                }

                // 检查名称是否已存在
                if (tempPlayers.some(p => p.name === name)) {
                    showNotification('❌ 播放器名称已存在', 'error');
                    return;
                }

                const playerConfig = {
                    name: name,
                    type: type,
                    icon: icon || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzY2N2VlYSIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xMyAxMWw4IDUtOCA1eiIvPjwvc3ZnPg=="
                };

                if (type === 'protocol') {
                    const protocol = contentBody.querySelector('#new-protocol').value.trim();
                    if (!protocol) {
                        showNotification('❌ 请输入协议链接参数', 'error');
                        return;
                    }
                    if (!protocol.includes('${url}')) {
                        showNotification('❌ 协议链接必须包含 ${url} 占位符', 'error');
                        return;
                    }
                    playerConfig.protocol = protocol;
                } else {
                    const appName = contentBody.querySelector('#new-ush-app').value.trim();
                    if (!appName) {
                        showNotification('❌ 请输入应用名称', 'error');
                        return;
                    }
                    const args = contentBody.querySelector('#new-ush-args').value.trim();
                    playerConfig.appName = appName;
                    playerConfig.args = args ? args.split('\n').map(a => a.trim()).filter(a => a) : ['{url}'];
                }

                tempPlayers.push(playerConfig);
                currentView = name;
                renderPlayerList();
                updateView();
                showNotification(`✅ 已添加"${name}"`, 'success');
            });
        }

        // 渲染设置
        function renderMainSettings() {
            const contentBody = modal.querySelector('#content-body');

            const currentProxy = tempProxyList.map(p => {
                const prefix = p.enabled ? '' : '#';
                return `${prefix}${p.url}`;
            }).join('\n');

            contentBody.innerHTML = `
                <!-- 默认播放器设置 -->
                <div class="iwara-settings-section">
                    <div class="iwara-settings-header">
                        <h4>🎬 默认播放器</h4>
                        <button class="iwara-btn-small" id="reset-players">🔄 重置</button>
                    </div>
                    <select id="default-player-select" class="iwara-form-input">
                        ${tempPlayers.map(p => `<option value="${p.name}" ${p.name === currentDefaultPlayer ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>
                
                <!-- 按钮显示设置 -->
                <div class="iwara-settings-section">
                    <h4 class="iwara-settings-section-title">⚪ 按钮显示设置</h4>
                    
                    <div class="iwara-settings-subsection">
                        <h5>📄 详情页</h5>
                        <div class="iwara-button-settings-grid">
                            <label class="iwara-checkbox-label">
                                <input type="checkbox" id="detail-copy" ${tempButtonSettings.detailPage.copy ? 'checked' : ''}>
                                <span>复制链接</span>
                            </label>
                            <label class="iwara-checkbox-label">
                                <input type="checkbox" id="detail-newtab" ${tempButtonSettings.detailPage.newTab ? 'checked' : ''}>
                                <span>新标签页播放</span>
                            </label>
                            <label class="iwara-checkbox-label">
                                <input type="checkbox" id="detail-quality" ${tempButtonSettings.detailPage.quality ? 'checked' : ''}>
                                <span>540画质播放</span>
                            </label>
                            <label class="iwara-checkbox-label">
                                <input type="checkbox" id="detail-play" ${tempButtonSettings.detailPage.play ? 'checked' : ''}>
                                <span>Source画质播放</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="iwara-settings-subsection">
                        <h5>📋 列表页</h5>
                        <div class="iwara-button-settings-grid">
                            <label class="iwara-checkbox-label">
                                <input type="checkbox" id="list-copy" ${tempButtonSettings.listPage.copy ? 'checked' : ''}>
                                <span>复制链接</span>
                            </label>
                            <label class="iwara-checkbox-label">
                                <input type="checkbox" id="list-newtab" ${tempButtonSettings.listPage.newTab ? 'checked' : ''}>
                                <span>新标签页播放</span>
                            </label>
                            <label class="iwara-checkbox-label">
                                <input type="checkbox" id="list-quality" ${tempButtonSettings.listPage.quality ? 'checked' : ''}>
                                <span>540画质播放</span>
                            </label>
                            <label class="iwara-checkbox-label">
                                <input type="checkbox" id="list-play" ${tempButtonSettings.listPage.play ? 'checked' : ''}>
                                <span>Source画质播放</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- 代理服务设置 -->
                <div class="iwara-settings-section">
                    <div class="iwara-settings-header">
                        <h4>🔗 代理服务</h4>
                        <div style="display: flex; gap: 8px;">
                            <button class="iwara-btn-small" id="save-multi-edit" style="display: none;">💾 保存</button>
                            <button class="iwara-btn-small" id="toggle-edit-mode">📝 手动编辑</button>
                        </div>
                    </div>
                    
                    <div id="single-add-mode" style="display: block;">
                        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                            <input type="text" id="new-proxy-input" placeholder="代理地址，多个将会随机选取" class="iwara-form-input" style="flex: 1;">
                            <button class="iwara-btn-small" id="add-proxy">➕ 添加</button>
                        </div>
                        <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <label style="color: #94a3b8; font-size: 13px; white-space: nowrap;">超时</label>
                                <input type="number" id="proxy-timeout" value="${tempProxyTimeout}" min="1" max="100000" step="100" class="iwara-form-input" style="width: 80px; padding: 4px 8px; font-size: 13px;">
                                <span style="color: #94a3b8; font-size: 13px;">ms</span>
                            </div>
                            <button class="iwara-btn-small" id="check-all-proxies">🔍 检测延迟</button>
                            <button class="iwara-btn-small" id="enable-all-proxies" style="background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.4); color: #22c55e;">✓ 启用全部</button>
                            <button class="iwara-btn-small" id="disable-failed-proxies" style="background: rgba(255, 165, 0, 0.2); border-color: rgba(255, 165, 0, 0.4); color: #ffa500;">⚠️ 禁用超时</button>
                            <button class="iwara-btn-small" id="delete-failed-proxies" style="background: rgba(255, 59, 48, 0.2); border-color: rgba(255, 59, 48, 0.4); color: #ff3b30;">🗑️ 删除超时</button>
                        </div>
                        <div id="proxy-list-container" class="iwara-proxy-list" style="max-height: 200px;"></div>
                    </div>
                    
                    <div id="multi-edit-mode" style="display: none;">
                        <textarea id="proxy-input" class="iwara-form-textarea" style="min-height: 160px;" placeholder="每行一个代理，以#开头表示禁用:\nproxy1.example.com\n#proxy2.example.com (禁用)\nhttps://proxy3.example.com/">${currentProxy}</textarea>
                        <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">💡 每行一个代理地址，以 # 开头的代理将被禁用</p>
                    </div>
                    
                    <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">
                        <a href="https://github.com/1234567Yang/cf-proxy-ex" target="_blank" style="color: #818cf8; text-decoration: none;">⭐ 代理项目(需自行部署): cf-proxy-ex</a>
                    </p>
                </div>
            `;

            // 绑定默认播放器选择
            contentBody.querySelector('#default-player-select').addEventListener('change', (e) => {
                currentDefaultPlayer = e.target.value;
            });

            // 绑定按钮显示设置 - 视频详情页
            contentBody.querySelector('#detail-copy').addEventListener('change', (e) => {
                tempButtonSettings.detailPage.copy = e.target.checked;
            });
            contentBody.querySelector('#detail-newtab').addEventListener('change', (e) => {
                tempButtonSettings.detailPage.newTab = e.target.checked;
            });
            contentBody.querySelector('#detail-quality').addEventListener('change', (e) => {
                tempButtonSettings.detailPage.quality = e.target.checked;
            });
            contentBody.querySelector('#detail-play').addEventListener('change', (e) => {
                tempButtonSettings.detailPage.play = e.target.checked;
            });

            // 绑定按钮显示设置 - 视频列表页
            contentBody.querySelector('#list-copy').addEventListener('change', (e) => {
                tempButtonSettings.listPage.copy = e.target.checked;
            });
            contentBody.querySelector('#list-newtab').addEventListener('change', (e) => {
                tempButtonSettings.listPage.newTab = e.target.checked;
            });
            contentBody.querySelector('#list-quality').addEventListener('change', (e) => {
                tempButtonSettings.listPage.quality = e.target.checked;
            });
            contentBody.querySelector('#list-play').addEventListener('change', (e) => {
                tempButtonSettings.listPage.play = e.target.checked;
            });

            // 绑定恢复默认
            contentBody.querySelector('#reset-players').addEventListener('click', () => {
                if (confirm('确定要恢复到默认播放器列表吗？\n\n这将删除所有自定义播放器。')) {
                    modal.remove();
                    resetToDefaultPlayers();
                }
            });

            // 代理设置逻辑
            renderProxyList();
            setupProxyEditMode();
        }

        // 渲染代理列表
        function renderProxyList() {
            const container = modal.querySelector('#proxy-list-container');
            if (!container) return;

            container.innerHTML = '';

            if (tempProxyList.length === 0) {
                container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px 0; margin: 0;">暂无代理，请使用上方输入框添加</p>';
                return;
            }

            tempProxyList.forEach((proxy, index) => {
                const item = document.createElement('div');
                item.className = 'iwara-proxy-item' + (proxy.enabled ? '' : ' disabled');
                item.dataset.index = index;

                const urlSpan = document.createElement('span');
                urlSpan.className = 'proxy-url';
                urlSpan.textContent = proxy.url;

                // 状态显示
                const statusSpan = document.createElement('span');
                statusSpan.className = 'iwara-proxy-status';
                statusSpan.style.display = 'none';
                statusSpan.textContent = '-';

                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'iwara-proxy-toggle' + (proxy.enabled ? '' : ' disabled');
                toggleBtn.textContent = proxy.enabled ? '✓ 启用' : '✕ 禁用';
                toggleBtn.addEventListener('click', () => {
                    proxy.enabled = !proxy.enabled;
                    renderProxyList();
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'iwara-proxy-delete';
                deleteBtn.textContent = '🗑️';
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`确定要删除代理 "${proxy.url}" 吗？`)) {
                        tempProxyList.splice(index, 1);
                        renderProxyList();
                    }
                });

                item.appendChild(urlSpan);
                item.appendChild(statusSpan);
                item.appendChild(toggleBtn);
                item.appendChild(deleteBtn);
                container.appendChild(item);
            });
        }

        // 检测单个代理
        async function checkSingleProxy(proxyUrl, timeoutMs) {
            const startTime = performance.now();
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve({ success: false, latency: -1, error: 'timeout' });
                }, timeoutMs);

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: proxyUrl,
                    timeout: timeoutMs,
                    onload: function(response) {
                        clearTimeout(timeout);
                        const endTime = performance.now();
                        const latency = Math.round(endTime - startTime);
                        // 任何响应都算成功（包括404等），只要能连接
                        resolve({ success: true, latency, status: response.status });
                    },
                    onerror: function(error) {
                        clearTimeout(timeout);
                        resolve({ success: false, latency: -1, error: 'network' });
                    },
                    ontimeout: function() {
                        clearTimeout(timeout);
                        resolve({ success: false, latency: -1, error: 'timeout' });
                    }
                });
            });
        }

        // 检测所有代理
        async function checkAllProxies() {
            const container = modal.querySelector('#proxy-list-container');
            if (!container || tempProxyList.length === 0) {
                showNotification('❌ 没有可检测的代理', 'error');
                return;
            }

            // 获取自定义超时时间
            const timeoutInput = modal.querySelector('#proxy-timeout');
            let timeoutMs = parseInt(timeoutInput.value) || 10000;
            
            // 验证超时时间范围
            if (timeoutMs < 100) timeoutMs = 100;
            if (timeoutMs > 100000) timeoutMs = 100000;
            timeoutInput.value = timeoutMs;

            const checkBtn = modal.querySelector('#check-all-proxies');
            const originalText = checkBtn.textContent;
            checkBtn.disabled = true;
            checkBtn.textContent = '🔍 检测中...';

            // 显示所有状态标签并设置为检测中
            const items = container.querySelectorAll('.iwara-proxy-item');
            items.forEach(item => {
                const statusSpan = item.querySelector('.iwara-proxy-status');
                if (statusSpan) {
                    statusSpan.style.display = 'inline-block';
                    statusSpan.className = 'iwara-proxy-status checking';
                    statusSpan.textContent = '检测中...';
                }
                // 清除之前的检测结果
                const proxy = tempProxyList[item.dataset.index];
                if (proxy) {
                    delete proxy.checkResult;
                }
            });

            // 并发检测所有代理
            const results = await Promise.all(
                tempProxyList.map(proxy => checkSingleProxy(proxy.url, timeoutMs))
            );

            // 更新显示结果
            results.forEach((result, index) => {
                const item = container.querySelector(`[data-index="${index}"]`);
                if (!item) return;

                const statusSpan = item.querySelector('.iwara-proxy-status');
                if (!statusSpan) return;

                // 保存检测结果到代理对象
                tempProxyList[index].checkResult = result;

                if (result.success) {
                    const latency = result.latency;
                    statusSpan.textContent = `${latency}ms`;
                    
                    // 根据延迟设置不同颜色
                    if (latency < 200) {
                        statusSpan.className = 'iwara-proxy-status success';
                    } else if (latency < 1000) {
                        statusSpan.className = 'iwara-proxy-status slow';
                    } else {
                        statusSpan.className = 'iwara-proxy-status slow';
                    }
                } else {
                    statusSpan.className = 'iwara-proxy-status failed';
                    statusSpan.textContent = result.error === 'timeout' ? '超时' : '失败';
                }
            });

            checkBtn.disabled = false;
            checkBtn.textContent = originalText;

            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;
            showNotification(`✅ 检测完成: ${successCount} 个可用, ${failCount} 个失败`, 'success');
        }

        // 启用全部代理
        function enableAllProxies() {
            if (tempProxyList.length === 0) {
                showNotification('ℹ️ 没有可启用的代理', 'info');
                return;
            }

            const disabledCount = tempProxyList.filter(p => !p.enabled).length;
            
            if (disabledCount === 0) {
                showNotification('ℹ️ 所有代理都已启用', 'info');
                return;
            }

            tempProxyList.forEach(proxy => {
                proxy.enabled = true;
            });
            renderProxyList();
            showNotification(`✅ 已启用全部代理 (${disabledCount} 个)`, 'success');
        }

        // 禁用所有失败的代理
        function disableFailedProxies() {
            const failedCount = tempProxyList.filter(p => p.checkResult && !p.checkResult.success).length;
            
            if (failedCount === 0) {
                showNotification('ℹ️ 没有检测到超时的代理', 'info');
                return;
            }

            if (confirm(`确定要禁用 ${failedCount} 个失败的代理吗？`)) {
                tempProxyList.forEach(proxy => {
                    if (proxy.checkResult && !proxy.checkResult.success) {
                        proxy.enabled = false;
                    }
                });
                renderProxyList();
                showNotification(`✅ 已禁用 ${failedCount} 个失败的代理`, 'success');
            }
        }

        // 删除所有失败的代理
        function deleteFailedProxies() {
            const failedCount = tempProxyList.filter(p => p.checkResult && !p.checkResult.success).length;
            
            if (failedCount === 0) {
                showNotification('ℹ️ 没有检测到超时的代理', 'info');
                return;
            }

            if (confirm(`确定要删除 ${failedCount} 个失败的代理吗？\n\n此操作不可恢复！`)) {
                tempProxyList = tempProxyList.filter(p => !p.checkResult || p.checkResult.success);
                renderProxyList();
                showNotification(`✅ 已删除 ${failedCount} 个失败的代理`, 'success');
            }
        }

        // 设置代理编辑模式
        function setupProxyEditMode() {
            let isMultiEditMode = false;
            const toggleModeBtn = modal.querySelector('#toggle-edit-mode');
            const singleAddMode = modal.querySelector('#single-add-mode');
            const multiEditMode = modal.querySelector('#multi-edit-mode');
            const addProxyBtn = modal.querySelector('#add-proxy');
            const newProxyInput = modal.querySelector('#new-proxy-input');

            if (!toggleModeBtn) return;

            const saveMultiEditBtn = modal.querySelector('#save-multi-edit');

            toggleModeBtn.addEventListener('click', () => {
                // 切换到手动编辑
                const textarea = modal.querySelector('#proxy-input');
                const lines = tempProxyList.map(p => {
                    const prefix = p.enabled ? '' : '#';
                    return `${prefix}${p.url}`;
                });
                textarea.value = lines.join('\n');

                singleAddMode.style.display = 'none';
                multiEditMode.style.display = 'block';
                saveMultiEditBtn.style.display = 'block';
                toggleModeBtn.textContent = '📋 列表编辑';
            });

            // 保存手动编辑
            if (saveMultiEditBtn) {
                saveMultiEditBtn.addEventListener('click', () => {
                    const textarea = modal.querySelector('#proxy-input');
                    const lines = textarea.value.split('\n');

                    tempProxyList = [];
                    const urlSet = new Set(); // 用于去重
                    let duplicateCount = 0;

                    lines.forEach(line => {
                        line = line.trim();
                        if (line === '') return;

                        let enabled = true;
                        let url = line;

                        if (line.startsWith('#')) {
                            enabled = false;
                            url = line.substring(1).trim();
                        }

                        if (url !== '') {
                            // 标准化URL用于去重判断
                            const normalized = normalizeProxyUrl(url);
                            if (normalized && !urlSet.has(normalized)) {
                                urlSet.add(normalized);
                                tempProxyList.push({ url: normalized, enabled });
                            } else if (normalized && urlSet.has(normalized)) {
                                duplicateCount++;
                            }
                        }
                    });

                    multiEditMode.style.display = 'none';
                    singleAddMode.style.display = 'block';
                    saveMultiEditBtn.style.display = 'none';
                    toggleModeBtn.textContent = '📝 手动编辑';
                    renderProxyList();
                    
                    if (duplicateCount > 0) {
                        showNotification(`✅ 已保存并切换到列表编辑（已去重 ${duplicateCount} 个重复项）`, 'success');
                    } else {
                        showNotification('✅ 已保存并切换到列表编辑', 'success');
                    }
                });
            }

            // 添加代理
            addProxyBtn.addEventListener('click', () => {
                const url = newProxyInput.value.trim();

                if (!url) {
                    showNotification('❌ 请输入代理地址', 'error');
                    return;
                }

                const normalized = normalizeProxyUrl(url);
                if (normalized === null) {
                    showNotification(`❌ 代理地址格式错误: ${url}`, 'error');
                    return;
                }

                if (tempProxyList.some(p => p.url === normalized)) {
                    showNotification('❌ 该代理已存在', 'error');
                    return;
                }

                tempProxyList.push({ url: normalized, enabled: true });
                newProxyInput.value = '';
                renderProxyList();
                showNotification('✅ 代理已添加', 'success');
            });

            newProxyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addProxyBtn.click();
                }
            });

            // 超时时间输入框变化监听
            const timeoutInput = modal.querySelector('#proxy-timeout');
            if (timeoutInput) {
                timeoutInput.addEventListener('change', () => {
                    let value = parseInt(timeoutInput.value) || 10000;
                    // 验证范围
                    if (value < 100) value = 100;
                    if (value > 100000) value = 100000;
                    timeoutInput.value = value;
                    tempProxyTimeout = value;
                });
            }

            // 检测所有代理按钮
            const checkAllBtn = modal.querySelector('#check-all-proxies');
            if (checkAllBtn) {
                checkAllBtn.addEventListener('click', checkAllProxies);
            }

            // 启用全部代理按钮
            const enableAllBtn = modal.querySelector('#enable-all-proxies');
            if (enableAllBtn) {
                enableAllBtn.addEventListener('click', enableAllProxies);
            }

            // 禁用失败代理按钮
            const disableFailedBtn = modal.querySelector('#disable-failed-proxies');
            if (disableFailedBtn) {
                disableFailedBtn.addEventListener('click', disableFailedProxies);
            }

            // 删除失败代理按钮
            const deleteFailedBtn = modal.querySelector('#delete-failed-proxies');
            if (deleteFailedBtn) {
                deleteFailedBtn.addEventListener('click', deleteFailedProxies);
            }
        }

        // 初始化
        renderPlayerList();
        updateView(); // 默认显示设置页

        // 设置点击
        modal.querySelector('[data-view="main-settings"]').addEventListener('click', () => {
            currentView = 'main-settings';
            updateView();
        });

        // 关闭按钮
        const closeModal = () => modal.remove();
        modal.querySelector('#btn-close').addEventListener('click', closeModal);

        // 保存设置按钮
        function saveSettings(shouldReload = false) {
            let hasChanges = false;

            // 保存默认播放器
            if (externalPlayer !== currentDefaultPlayer) {
                externalPlayer = currentDefaultPlayer;
                GM_setValue('externalPlayer', externalPlayer);
                hasChanges = true;
            }

            // 保存播放器列表
            const oldPlayersStr = JSON.stringify(customPlayers);
            const newPlayersStr = JSON.stringify(tempPlayers);
            if (oldPlayersStr !== newPlayersStr) {
                customPlayers = tempPlayers;
                GM_setValue('customPlayers', customPlayers);
                hasChanges = true;
            }

            // 保存按钮显示设置
            const oldButtonSettingsStr = JSON.stringify(buttonSettings);
            const newButtonSettingsStr = JSON.stringify(tempButtonSettings);
            if (oldButtonSettingsStr !== newButtonSettingsStr) {
                buttonSettings = tempButtonSettings;
                GM_setValue('buttonSettings', buttonSettings);
                hasChanges = true;
            }

            // 验证并保存代理列表
            const validatedProxyList = [];
            for (const proxy of tempProxyList) {
                const normalized = normalizeProxyUrl(proxy.url);
                if (normalized === null) {
                    showNotification(`❌ 代理地址格式错误: ${proxy.url}`, 'error');
                    return;
                }
                validatedProxyList.push({
                    url: normalized,
                    enabled: proxy.enabled
                });
            }

            const oldListStr = JSON.stringify(GM_getValue('proxyList', []));
            const newListStr = JSON.stringify(validatedProxyList);

            if (oldListStr !== newListStr) {
                proxyList = validatedProxyList;
                GM_setValue('proxyList', proxyList);
                hasChanges = true;
            }

            // 保存代理超时时间
            if (proxyTimeout !== tempProxyTimeout) {
                proxyTimeout = tempProxyTimeout;
                GM_setValue('proxyTimeout', proxyTimeout);
                hasChanges = true;
            }

            closeModal();

            if (hasChanges) {
                if (shouldReload) {
                    showNotification('✅ 设置已保存，正在刷新页面...', 'success');
                    setTimeout(() => location.reload(), 800);
                } else {
                    showNotification('✅ 设置已保存，正在应用更改...', 'success');
                    // 刷新所有按钮以应用新设置
                    setTimeout(() => {
                        refreshAllButtons();
                        showNotification('✅ 设置已生效', 'success');
                    }, 500);
                }
            } else {
                showNotification('ℹ️ 没有修改任何设置', 'info');
            }
        }

        modal.querySelector('#btn-save').addEventListener('click', () => saveSettings(false));
    }

    // 创建编辑播放器弹窗
    function createEditPlayerModal(playerData) {
        const editModal = document.createElement('div');
        editModal.id = 'iwara-edit-player-modal';
        editModal.style.zIndex = '9999999'; // 确保在设置弹窗之上

        // 根据播放器类型显示不同的输入框
        const isProtocolType = playerData.type === 'protocol';
        const protocolDisplay = isProtocolType ? 'block' : 'none';
        const ushDisplay = isProtocolType ? 'none' : 'block';

        editModal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2>✏️ 编辑播放器</h2>
                        <button class="close-btn">✕</button>
                    </div>

                    <div class="modal-body">
                        <div class="form-group">
                            <label>播放器名称</label>
                            <input type="text" id="edit-player-name-input" placeholder="例如: PotPlayer" class="form-input" value="${playerData.name}">
                        </div>

                        <div class="form-group">
                            <label>协议类型</label>
                            <select id="edit-protocol-type-select" class="form-input">
                                <option value="protocol" ${isProtocolType ? 'selected' : ''}>标准协议</option>
                                <option value="ush" ${!isProtocolType ? 'selected' : ''}>USH协议</option>
                            </select>
                        </div>

                        <div class="form-group" id="edit-protocol-input-group" style="display: ${protocolDisplay};">
                            <label>协议链接参数</label>
                            <input type="text" id="edit-protocol-input" placeholder="例如: potplayer://\${url}" class="form-input" value="${playerData.protocol || ''}">
                            <p class="hint">可用参数: \${title} 标题 | \${url} 原始链接 | \${url:base64} base64编码 | \${url:encode} url编码</p>
                        </div>

                        <div class="form-group" id="edit-ush-app-input-group" style="display: ${ushDisplay};">
                            <label>应用名称</label>
                            <input type="text" id="edit-ush-app-input" placeholder="例如: MPV (和ush工具配置的名称要完全一致)" class="form-input" value="${playerData.appName || ''}">
                            <p class="iwara-hint"><a href="https://github.com/LuckyPuppy514/url-scheme-handler" target="_blank" style="color: #667eea;">⭐ ush工具 - LuckyPuppy514/url-scheme-handler</a></p>
                        </div>

                        <div class="form-group" id="edit-ush-args-input-group" style="display: ${ushDisplay};">
                            <label>启动参数 (可选)</label>
                            <textarea id="edit-ush-args-input" placeholder="每行一个参数，例如:\n--ontop\n--fullscreen" class="form-textarea" rows="3">${playerData.args ? playerData.args.join('\n') : ''}</textarea>
                            <p class="hint">可用参数: \${title} 标题 | \${url} 原始链接 | \${url:base64} base64编码 | \${url:encode} url编码</p>
                        </div>

                        <div class="form-group">
                            <label>图标 (Base64 Data URL)</label>
                            <textarea id="edit-player-icon-input" placeholder="data:image/png;base64,iVBORw0KGgoAAAANS..." class="form-textarea" rows="3">${playerData.icon || ''}</textarea>
                            <p class="hint">支持 data:image/png、data:image/svg+xml 等格式</p>
                        </div>

                        <div class="form-group">
                            <label>描述 (可选)</label>
                            <input type="text" id="edit-player-desc-input" placeholder="例如: 需要安装 PotPlayer" class="form-input" value="${playerData.description || ''}">
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn-cancel">取消</button>
                        <button class="btn-save">保存修改</button>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #iwara-edit-player-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999999 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }

            #iwara-edit-player-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(20, 20, 30, 0.75);
                backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }

            #iwara-edit-player-modal .modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                width: 90%;
                max-width: 450px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.3s ease;
                overflow: hidden;
            }

            #iwara-edit-player-modal .modal-header {
                padding: 24px 28px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            #iwara-edit-player-modal .modal-header h2 {
                margin: 0;
                color: white;
                font-size: 20px;
                font-weight: 600;
            }

            #iwara-edit-player-modal .close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            #iwara-edit-player-modal .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }

            #iwara-edit-player-modal .modal-body {
                padding: 28px;
                max-height: 70vh;
                overflow-y: auto;
            }

            #iwara-edit-player-modal .form-group {
                margin-bottom: 20px;
            }

            #iwara-edit-player-modal .form-group label {
                display: block;
                color: #e0e0e0;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 8px;
            }

            #iwara-edit-player-modal .form-input,
            #iwara-edit-player-modal .form-textarea {
                width: 100%;
                padding: 10px 14px;
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #e0e0e0;
                font-size: 14px;
                transition: all 0.2s;
                box-sizing: border-box;
                font-family: inherit;
            }

            #iwara-edit-player-modal .form-input:focus,
            #iwara-edit-player-modal .form-textarea:focus {
                outline: none;
                border-color: #667eea;
                background: rgba(255, 255, 255, 0.08);
            }

            #iwara-edit-player-modal .form-input::placeholder,
            #iwara-edit-player-modal .form-textarea::placeholder {
                color: #666;
            }

            #iwara-edit-player-modal .form-textarea {
                resize: vertical;
                min-height: 60px;
            }

            #iwara-edit-player-modal select.form-input {
                cursor: pointer;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 12px center;
                padding-right: 36px;
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
            }

            #iwara-edit-player-modal select.form-input:hover {
                border-color: rgba(102, 126, 234, 0.5);
            }

            #iwara-edit-player-modal select.form-input option {
                background: #1a1a2e;
                color: #e0e0e0;
                padding: 10px;
            }

            #iwara-edit-player-modal select.form-input option:hover {
                background: #667eea;
            }

            #iwara-edit-player-modal .hint {
                margin: 8px 0 0 0;
                color: #999;
                font-size: 12px;
            }

            #iwara-edit-player-modal .modal-footer {
                padding: 20px 28px;
                background: rgba(0, 0, 0, 0.2);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            #iwara-edit-player-modal .modal-footer button {
                padding: 10px 24px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            #iwara-edit-player-modal .btn-cancel {
                background: rgba(255, 255, 255, 0.1);
                color: #e0e0e0;
            }

            #iwara-edit-player-modal .btn-cancel:hover {
                background: rgba(255, 255, 255, 0.15);
            }

            #iwara-edit-player-modal .btn-save {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            #iwara-edit-player-modal .btn-save:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
        `;

        editModal.appendChild(style);
        document.body.appendChild(editModal);

        const originalName = playerData.name; // 保存原始名称用于更新

        // 绑定事件
        const closeEditModal = () => editModal.remove();

        editModal.querySelector('.close-btn').addEventListener('click', closeEditModal);
        editModal.querySelector('.btn-cancel').addEventListener('click', closeEditModal);
        editModal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeEditModal();
            }
        });

        // 协议类型
        const protocolTypeSelect = editModal.querySelector('#edit-protocol-type-select');
        const protocolInputGroup = editModal.querySelector('#edit-protocol-input-group');
        const ushAppInputGroup = editModal.querySelector('#edit-ush-app-input-group');
        const ushArgsInputGroup = editModal.querySelector('#edit-ush-args-input-group');

        protocolTypeSelect.addEventListener('change', () => {
            if (protocolTypeSelect.value === 'protocol') {
                protocolInputGroup.style.display = 'block';
                ushAppInputGroup.style.display = 'none';
                ushArgsInputGroup.style.display = 'none';
            } else {
                protocolInputGroup.style.display = 'none';
                ushAppInputGroup.style.display = 'block';
                ushArgsInputGroup.style.display = 'block';
            }
        });

        // 保存修改
        editModal.querySelector('.btn-save').addEventListener('click', () => {
            const name = editModal.querySelector('#edit-player-name-input').value.trim();
            const icon = editModal.querySelector('#edit-player-icon-input').value.trim();
            const description = editModal.querySelector('#edit-player-desc-input').value.trim();
            const protocolType = protocolTypeSelect.value;

            if (!name) {
                showNotification('❌ 请输入播放器名称', 'error');
                return;
            }

            // 检查名称是否与其他播放器冲突（除了自己）
            const existingPlayer = customPlayers.find(p => p.name === name && p.name !== originalName);
            if (existingPlayer) {
                showNotification('❌ 播放器名称已存在，请使用其他名称', 'error');
                return;
            }

            // 验证 icon 格式
            let validIcon = icon;
            if (icon && !icon.startsWith('data:image')) {
                showNotification('❌ 图标必须是 data:image 格式的 Base64 数据', 'error');
                return;
            }
            if (!icon) {
                // 默认图标
                validIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzY2N2VlYSIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xMyAxMWw4IDUtOCA1eiIvPjwvc3ZnPg==";
            }

            const updatedPlayerConfig = {
                name: name,
                icon: validIcon,
                description: description || '自定义播放器'
            };

            if (protocolType === 'protocol') {
                const protocol = editModal.querySelector('#edit-protocol-input').value.trim();
                if (!protocol) {
                    showNotification('❌ 请输入协议链接参数', 'error');
                    return;
                }
                if (!protocol.includes('${url}')) {
                    showNotification('❌ 协议链接参数必须包含 ${url} 占位符', 'error');
                    return;
                }
                updatedPlayerConfig.type = 'protocol';
                updatedPlayerConfig.protocol = protocol;
            } else {
                const appName = editModal.querySelector('#edit-ush-app-input').value.trim();
                if (!appName) {
                    showNotification('❌ 请输入应用名称', 'error');
                    return;
                }
                const args = editModal.querySelector('#edit-ush-args-input').value.trim();
                updatedPlayerConfig.type = 'ush';
                updatedPlayerConfig.appName = appName;
                updatedPlayerConfig.args = args ? args.split('\n').map(a => a.trim()).filter(a => a) : ['{url}'];
            }

            // 找到播放器在数组中的索引并更新
            const playerIndex = customPlayers.findIndex(p => p.name === originalName);
            if (playerIndex !== -1) {
                customPlayers[playerIndex] = updatedPlayerConfig;
                GM_setValue('customPlayers', customPlayers);

                // 如果修改的是当前选中的播放器，更新选中状态
                if (externalPlayer === originalName && name !== originalName) {
                    externalPlayer = name;
                    GM_setValue('externalPlayer', externalPlayer);
                }

                closeEditModal();
                showNotification('✅ 播放器已更新', 'success');

                // 刷新设置弹窗中的播放器列表
                refreshPlayerList();
            } else {
                showNotification('❌ 播放器更新失败', 'error');
            }
        });
    }

    // 创建添加弹窗
    function createAddPlayerModal() {
        const addModal = document.createElement('div');
        addModal.id = 'iwara-add-player-modal';
        addModal.style.zIndex = '9999999'; // 确保在设置弹窗之上
        addModal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2>➕ 添加</h2>
                        <button class="close-btn">✕</button>
                    </div>

                    <div class="modal-body">
                        <div class="form-group">
                            <label>播放器名称</label>
                            <input type="text" id="player-name-input" placeholder="例如: PotPlayer" class="form-input">
                        </div>

                        <div class="form-group">
                            <label>协议类型</label>
                            <select id="protocol-type-select" class="form-input">
                                <option value="protocol">标准协议</option>
                                <option value="ush">USH协议</option>
                            </select>
                        </div>

                        <div class="form-group" id="protocol-input-group">
                            <label>协议链接参数</label>
                            <input type="text" id="protocol-input" placeholder="例如: potplayer://\${url}" class="form-input">
                            <p class="hint">可用参数: \${title} 标题 | \${url} 原始链接 | \${url:base64} base64编码 | \${url:encode} url编码</p>
                        </div>

                        <div class="form-group" id="ush-app-input-group" style="display: none;">
                            <label>应用名称</label>
                            <input type="text" id="ush-app-input" placeholder="例如: PotPlayer" class="form-input">
                        </div>

                        <div class="form-group" id="ush-args-input-group" style="display: none;">
                            <label>启动参数 (可选)</label>
                            <textarea id="ush-args-input" placeholder="每行一个参数，例如:\n--ontop\n--fullscreen" class="form-textarea" rows="3"></textarea>
                            <p class="hint">可用参数: \${title} 标题 | \${url} 原始链接 | \${url:base64} base64编码 | \${url:encode} url编码</p>
                        </div>

                        <div class="form-group">
                            <label>图标 (Base64 Data URL)</label>
                            <textarea id="player-icon-input" placeholder="data:image/png;base64,iVBORw0KGgoAAAANS..." class="form-textarea" rows="3"></textarea>
                            <p class="hint">支持 data:image/png、data:image/svg+xml 等格式</p>
                        </div>

                        <div class="form-group">
                            <label>描述 (可选)</label>
                            <input type="text" id="player-desc-input" placeholder="例如: 需要安装 PotPlayer" class="form-input">
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn-cancel">取消</button>
                        <button class="btn-save">添加</button>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #iwara-add-player-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999999 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }

            #iwara-add-player-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(20, 20, 30, 0.75);
                backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }

            #iwara-add-player-modal .modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                width: 90%;
                max-width: 450px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.3s ease;
                overflow: hidden;
            }

            #iwara-add-player-modal .modal-header {
                padding: 24px 28px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            #iwara-add-player-modal .modal-header h2 {
                margin: 0;
                color: white;
                font-size: 20px;
                font-weight: 600;
            }

            #iwara-add-player-modal .close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            #iwara-add-player-modal .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }

            #iwara-add-player-modal .modal-body {
                padding: 28px;
                max-height: 70vh;
                overflow-y: auto;
            }

            #iwara-add-player-modal .form-group {
                margin-bottom: 20px;
            }

            #iwara-add-player-modal .form-group label {
                display: block;
                color: #e0e0e0;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 8px;
            }

            #iwara-add-player-modal .form-input,
            #iwara-add-player-modal .form-textarea {
                width: 100%;
                padding: 10px 14px;
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #e0e0e0;
                font-size: 14px;
                transition: all 0.2s;
                box-sizing: border-box;
                font-family: inherit;
            }

            #iwara-add-player-modal .form-input:focus,
            #iwara-add-player-modal .form-textarea:focus {
                outline: none;
                border-color: #667eea;
                background: rgba(255, 255, 255, 0.08);
            }

            #iwara-add-player-modal .form-input::placeholder,
            #iwara-add-player-modal .form-textarea::placeholder {
                color: #666;
            }

            #iwara-add-player-modal .form-textarea {
                resize: vertical;
                min-height: 60px;
            }

            #iwara-add-player-modal select.form-input {
                cursor: pointer;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 12px center;
                padding-right: 36px;
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
            }

            #iwara-add-player-modal select.form-input:hover {
                border-color: rgba(102, 126, 234, 0.5);
            }

            #iwara-add-player-modal select.form-input option {
                background: #1a1a2e;
                color: #e0e0e0;
                padding: 10px;
            }

            #iwara-add-player-modal select.form-input option:hover {
                background: #667eea;
            }

            #iwara-add-player-modal .hint {
                margin: 8px 0 0 0;
                color: #999;
                font-size: 12px;
            }

            #iwara-add-player-modal .modal-footer {
                padding: 20px 28px;
                background: rgba(0, 0, 0, 0.2);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            #iwara-add-player-modal .modal-footer button {
                padding: 10px 24px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            #iwara-add-player-modal .btn-cancel {
                background: rgba(255, 255, 255, 0.1);
                color: #e0e0e0;
            }

            #iwara-add-player-modal .btn-cancel:hover {
                background: rgba(255, 255, 255, 0.15);
            }

            #iwara-add-player-modal .btn-save {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            #iwara-add-player-modal .btn-save:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
        `;

        addModal.appendChild(style);
        document.body.appendChild(addModal);

        // 绑定事件
        const closeAddModal = () => addModal.remove();

        addModal.querySelector('.close-btn').addEventListener('click', closeAddModal);
        addModal.querySelector('.btn-cancel').addEventListener('click', closeAddModal);
        addModal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeAddModal();
            }
        });

        // 协议类型
        const protocolTypeSelect = addModal.querySelector('#protocol-type-select');
        const protocolInputGroup = addModal.querySelector('#protocol-input-group');
        const ushAppInputGroup = addModal.querySelector('#ush-app-input-group');
        const ushArgsInputGroup = addModal.querySelector('#ush-args-input-group');

        protocolTypeSelect.addEventListener('change', () => {
            if (protocolTypeSelect.value === 'protocol') {
                protocolInputGroup.style.display = 'block';
                ushAppInputGroup.style.display = 'none';
                ushArgsInputGroup.style.display = 'none';
            } else {
                protocolInputGroup.style.display = 'none';
                ushAppInputGroup.style.display = 'block';
                ushArgsInputGroup.style.display = 'block';
            }
        });

        // 保存播放器
        addModal.querySelector('.btn-save').addEventListener('click', () => {
            const name = addModal.querySelector('#player-name-input').value.trim();
            const icon = addModal.querySelector('#player-icon-input').value.trim();
            const description = addModal.querySelector('#player-desc-input').value.trim();
            const protocolType = protocolTypeSelect.value;

            if (!name) {
                showNotification('❌ 请输入播放器名称', 'error');
                return;
            }

            // 检查名称是否已存在
            const existingPlayer = customPlayers.find(p => p.name === name);
            if (existingPlayer) {
                showNotification('❌ 播放器名称已存在，请使用其他名称', 'error');
                return;
            }

            // 验证 icon 格式
            let validIcon = icon;
            if (icon && !icon.startsWith('data:image')) {
                showNotification('❌ 图标必须是 data:image 格式的 Base64 数据', 'error');
                return;
            }
            if (!icon) {
                // 默认图标
                validIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzY2N2VlYSIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xMyAxMWw4IDUtOCA1eiIvPjwvc3ZnPg==";
            }

            const playerConfig = {
                name: name,
                icon: validIcon,
                description: description || '自定义播放器'
            };

            if (protocolType === 'protocol') {
                const protocol = addModal.querySelector('#protocol-input').value.trim();
                if (!protocol) {
                    showNotification('❌ 请输入协议链接参数', 'error');
                    return;
                }
                if (!protocol.includes('${url}')) {
                    showNotification('❌ 协议链接参数必须包含 ${url} 占位符', 'error');
                    return;
                }
                playerConfig.type = 'protocol';
                playerConfig.protocol = protocol;
            } else {
                const appName = addModal.querySelector('#ush-app-input').value.trim();
                if (!appName) {
                    showNotification('❌ 请输入应用名称', 'error');
                    return;
                }
                const args = addModal.querySelector('#ush-args-input').value.trim();
                playerConfig.type = 'ush';
                playerConfig.appName = appName;
                playerConfig.args = args ? args.split('\n').map(a => a.trim()).filter(a => a) : ['{url}'];
            }

            customPlayers.push(playerConfig);
            GM_setValue('customPlayers', customPlayers);

            closeAddModal();
            showNotification('✅ 播放器已添加', 'success');

            // 重新打开设置弹窗
            const settingsModal = document.getElementById('iwara-mpv-settings-modal');
            if (settingsModal) {
                settingsModal.remove();
            }
            setTimeout(() => createSettingsModal(), 500);
        });
    }

    // 显示通知（带高亮效果）
    function showNotification(message, type = 'info') {
        const styles = {
            error: {
                bg: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                glow: 'rgba(255, 107, 107, 0.5)',
                glowStrong: 'rgba(255, 107, 107, 0.8)'
            },
            success: {
                bg: 'linear-gradient(135deg, #51cf66 0%, #37b24d 100%)',
                glow: 'rgba(81, 207, 102, 0.5)',
                glowStrong: 'rgba(81, 207, 102, 0.8)'
            },
            info: {
                bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                glow: 'rgba(102, 126, 234, 0.5)',
                glowStrong: 'rgba(102, 126, 234, 0.8)'
            }
        };

        const style = styles[type] || styles.info;
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999999;
            padding: 16px 24px;
            background: ${style.bg};
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px ${style.glow};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            border: 2px solid rgba(255, 255, 255, 0.3);
            animation: slideInRight 0.3s ease, pulse 1.5s ease-in-out infinite;
            white-space: pre-line;
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes pulse {
                0%, 100% { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px ${style.glow}; }
                50% { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 30px ${style.glowStrong}, 0 0 10px rgba(255, 255, 255, 0.5); }
            }
        `;
        notification.appendChild(styleSheet);

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // 通知容器和队列管理（新版本 - 支持堆叠）
    let notificationContainer = null;
    const activeNotifications = new Set();

    // 显示通知（优化版 - 带代理信息和堆叠管理）
    function showNotificationV2(message, type = 'info') {
        // 添加代理主机名信息
        const enabledProxies = proxyList.filter(p => p.enabled);
        if (enabledProxies.length > 0) {
            const currentProxy = enabledProxies[Math.floor(Math.random() * enabledProxies.length)];
            try {
                const url = new URL(currentProxy.url);
                const hostname = url.hostname;
                message = `${message}\n🔗 当前代理: ${hostname}`;
            } catch (e) {
                // URL 解析失败，不添加主机名
            }
        }

        const styles = {
            error: {
                bg: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                glow: 'rgba(255, 107, 107, 0.5)',
                glowStrong: 'rgba(255, 107, 107, 0.8)'
            },
            success: {
                bg: 'linear-gradient(135deg, #51cf66 0%, #37b24d 100%)',
                glow: 'rgba(81, 207, 102, 0.5)',
                glowStrong: 'rgba(81, 207, 102, 0.8)'
            },
            info: {
                bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                glow: 'rgba(102, 126, 234, 0.5)',
                glowStrong: 'rgba(102, 126, 234, 0.8)'
            }
        };

        // 确保容器存在
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'iwara-notification-container';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999999;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            `;
            document.body.appendChild(notificationContainer);

            // 添加全局样式
            if (!document.getElementById('iwara-notification-styles')) {
                const globalStyles = document.createElement('style');
                globalStyles.id = 'iwara-notification-styles';
                globalStyles.textContent = `
                    @keyframes slideInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOutRight {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(globalStyles);
            }
        }

        const style = styles[type] || styles.info;
        const notification = document.createElement('div');
        notification.className = 'iwara-notification-item';
        notification.style.cssText = `
            padding: 16px 24px;
            background: ${style.bg};
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px ${style.glow};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            border: 2px solid rgba(255, 255, 255, 0.3);
            animation: slideInRight 0.3s ease;
            white-space: pre-line;
            pointer-events: auto;
            transition: transform 0.3s ease, opacity 0.3s ease;
        `;

        // 添加脉冲动画样式
        const pulseId = `pulse-${Date.now()}`;
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes ${pulseId} {
                0%, 100% { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px ${style.glow}; }
                50% { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 30px ${style.glowStrong}, 0 0 10px rgba(255, 255, 255, 0.5); }
            }
        `;
        notification.appendChild(styleSheet);
        notification.style.animation += `, ${pulseId} 1.5s ease-in-out infinite`;

        notification.textContent = message;
        notificationContainer.appendChild(notification);
        activeNotifications.add(notification);

        // 自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                activeNotifications.delete(notification);
                notification.remove();
                
                // 如果没有通知了，移除容器
                if (activeNotifications.size === 0 && notificationContainer) {
                    notificationContainer.remove();
                    notificationContainer = null;
                }
            }, 300);
        }, 3000);
    }

    // 使用新版本通知函数
    showNotification = showNotificationV2;

    // 统一设置菜单
    GM_registerMenuCommand('⚙️ 播放器设置', createSettingsModal);

    // 创建右下角设置按钮
    function createSettingsButton() {
        // 防止重复创建
        if (document.getElementById('iwara-mpv-settings-fab')) {
            return;
        }

        const settingsButton = document.createElement('button');
        settingsButton.id = 'iwara-mpv-settings-fab';
        settingsButton.className = 'iwara-mpv-fab';
        settingsButton.innerHTML = '⚙️';
        settingsButton.title = '播放器设置';

        // 点击打开设置
        settingsButton.addEventListener('click', createSettingsModal);

        document.body.appendChild(settingsButton);
    }

    // 压缩参数
    function compress(str) {
        return btoa(String.fromCharCode(...pako.gzip(str)));
    }

    // ========== 视频链接获取逻辑 (来自 getvideo.js) ==========

    // SHA-1 哈希 (使用Web Crypto API)
    async function hashStringSHA1(input) {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // 通过视频ID获取视频链接
    async function getVideoLinkById(videoId, quality = null) {
        try {
            // 获取代理前缀（在非 iwara.tv 域名下使用）
            const proxyPrefix = getCurrentProxyPrefix();

            // 获取本地存储的访问令牌
            const token = localStorage.getItem('token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // 步骤1: 获取视频信息（添加代理前缀）
            const apiUrl = `${proxyPrefix}https://api.iwara.tv/video/${videoId}`;
            const infoResponse = await fetch(apiUrl, {
                headers: headers
            });
            if (!infoResponse.ok) throw new Error('获取视频信息失败');
            const info = await infoResponse.json();

            if (!info.file) throw new Error('视频文件不存在');

            const fileUrl = new URL(info.fileUrl);
            const fileId = info.file.id;
            const expires = fileUrl.searchParams.get('expires');
            const hash = fileUrl.searchParams.get('hash');

            // 步骤2: 生成验证令牌
            const xVersion = await hashStringSHA1(`${fileId}_${expires}_5nFp9kmbNnHdAFhaqMvt`);

            // 步骤3: 获取视频资源（添加代理前缀）
            const resourceUrl = `${proxyPrefix}https://files.iwara.tv${fileUrl.pathname}?expires=${expires}&hash=${hash}`;
            const resourceHeaders = { 'X-Version': xVersion };
            if (token) {
                resourceHeaders['Authorization'] = `Bearer ${token}`;
            }

            const resourceResponse = await fetch(resourceUrl, {
                headers: resourceHeaders
            });

            if (!resourceResponse.ok) throw new Error('获取视频资源失败');
            const resources = await resourceResponse.json();

            // 步骤4: 提取链接 - 优先使用指定画质，否则使用设置的画质
            const targetQuality = quality || videoQuality;
            
            // 调试：输出所有可用画质
            console.log('[Iwara Player] 可用画质:', resources.map(v => v.name));
            console.log('[Iwara Player] 目标画质:', targetQuality);
            
            // 查找匹配的画质
            let video = resources.find(v => v.name === targetQuality);
            
            // 如果没找到精确匹配，尝试模糊匹配（例如 '540' 匹配 '540p'）
            if (!video && targetQuality) {
                video = resources.find(v => v.name.includes(targetQuality) || targetQuality.includes(v.name));
            }
            
            // 如果还是没找到，使用 Source 或第一个
            if (!video) {
                video = resources.find(v => v.name === 'Source') || resources[0];
            }
            
            const finalUrl = 'https:' + video.src.view;
            
            console.log('[Iwara Player] 最终使用画质:', video.name);

            return { url: finalUrl, title: info.title, quality: video.name };
        } catch (error) {
            console.error('[Iwara Player] 获取视频链接失败:', error);
            throw error;
        }
    }

    // 动态获取视频URL（支持页面变动后重新获取）
    function getVideoUrl() {
        const videoElement = document.querySelector('#vjs_video_3_html5_api, [id^="vjs_video_"][id$="_html5_api"], video.vjs-tech, video[src]');
        if (videoElement && videoElement.src) {
            return videoElement.src;
        }

        console.warn('%c[Iwara Player] 未找到视频源', 'color: #ff6b6b; font-weight: bold;');
        return null;
    }

    // 生成播放器协议链接
    function getPlayerProtocolUrl(playerName, videoUrl, videoTitle) {
        // 查找播放器
        const player = customPlayers.find(p => p.name === playerName);
        if (!player) {
            // 默认使用 MPV
            const defaultArgs = [`"${videoUrl}"`, `--force-media-title="${videoTitle}"`, '--ontop'];
            return `ush://MPV?${compress(defaultArgs.join(' '))}`;
        }

        // 替换参数的通用函数
        const replaceParams = (text) => {
            return text
                .replace(/\$\{title\}/g, videoTitle)
                .replace(/\$\{url\}/g, videoUrl)
                .replace(/\$\{url:base64\}/g, btoa(videoUrl))
                .replace(/\$\{url:encode\}/g, encodeURIComponent(videoUrl));
        };

        if (player.type === 'protocol') {
            // 标准协议: 支持参数模板，使用 ${xxx} 占位符
            const protocolTemplate = player.protocol || '';
            // 替换所有支持的占位符
            return replaceParams(protocolTemplate);
        } else if (player.type === 'ush') {
            // USH协议: ush://AppName?args
            let args = player.args || [`"${videoUrl}"`];
            // 替换占位符
            args = args.map(arg => replaceParams(arg));
            return `ush://${player.appName}?${compress(args.join(' '))}`;
        }

        // 兜底
        const defaultArgs = [`"${videoUrl}"`, `--force-media-title="${videoTitle}"`, '--ontop'];
        return `ush://MPV?${compress(defaultArgs.join(' '))}`;
    }

    // 获取视频标题的公共函数
    function getVideoTitle() {
        const titleElement = document.querySelector('h1.text-xl, h1[class*="title"], .page-video__details h1, h1');
        return titleElement ? titleElement.innerText.trim() : document.title;
    }

    // 创建SVG图标
    const createSVGIcon = (iconName) => {
        const pathData = SVG_ICONS[iconName];
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${pathData}</svg>`;
    };

    // 创建按钮的通用辅助函数
    const createButton = (className, title, content, onClick) => {
        const button = document.createElement('button');
        button.className = className;
        button.title = title;
        button.innerHTML = typeof content === 'string' && SVG_ICONS[content]
            ? createSVGIcon(content)
            : content;
        if (onClick) button.addEventListener('click', onClick);
        return button;
    };

    // 从当前页面 URL 提取视频 ID
    function getVideoIdFromUrl() {
        const match = window.location.pathname.match(/\/video\/([^\/]+)/);
        return match ? match[1] : null;
    }

    // 使用外部播放器播放 (视频详情页)
    function playWithExternalPlayer() {
        const videoUrl = getVideoUrl();

        if (!videoUrl) {
            showNotification('❌ 未找到视频源\n请确保视频已加载', 'error');
            return;
        }

        // 应用代理到视频URL
        const finalUrl = getProxiedUrl(videoUrl);

        // 获取视频标题
        const videoTitle = getVideoTitle();

        // 使用外部播放器播放
        const protocolUrl = getPlayerProtocolUrl(externalPlayer, finalUrl, videoTitle);

        try {
            // 合并输出信息
            console.log(`%c[Iwara Player] 播放信息`, 'color: #667eea; font-weight: bold;',
                '\n标题:', videoTitle,
                '\n播放器:', externalPlayer,
                '\n画质: 当前网页画质',
                '\nURL:', finalUrl);

            showNotification(`🎬 调用 ${externalPlayer} 播放器\n📸 画质: 当前网页画质`, 'info');
            window.open(protocolUrl, '_self');
        } catch (error) {
            console.error('[Iwara Player] 调用失败:', error);
            showNotification(`❌ 启动 ${externalPlayer} 失败\n请确保已安装并正确配置协议`, 'error');
        }
    }

    // 播放视频 (通过视频ID)
    async function playVideoById(videoId, videoTitle, quality = null) {
        try {
            showNotification('🔄 正在获取视频链接...', 'info');

            const { url, title, quality: actualQuality } = await getVideoLinkById(videoId, quality);
            const finalUrl = getProxiedUrl(url);
            const finalTitle = videoTitle || title;

            // 合并输出信息
            console.log(`%c[Iwara Player] 播放信息`, 'color: #667eea; font-weight: bold;',
                '\n视频ID:', videoId,
                '\n标题:', finalTitle,
                '\n播放器:', externalPlayer,
                '\n画质:', actualQuality,
                '\nURL:', finalUrl);

            // 使用外部播放器播放
            showNotification(`🎬 调用 ${externalPlayer} 播放器\n📸 画质: ${actualQuality}`, 'info');
            const protocolUrl = getPlayerProtocolUrl(externalPlayer, finalUrl, finalTitle);
            window.open(protocolUrl, '_self');
        } catch (error) {
            console.error('[Iwara Player] 播放失败:', error);
            showNotification(`❌ 获取视频链接失败\n${error.message}`, 'error');
        }
    }

    // 创建固定按钮组 (视频详情页)
    function createButtonGroup() {
        // 防止重复创建
        if (document.getElementById('iwara-mpv-button-group-detail')) {
            return;
        }

        // 获取当前视频URL
        const videoUrl = getVideoUrl();
        if (!videoUrl) {
            console.warn('[Iwara Player] 视频URL未找到，无法创建按钮');
            return;
        }

        // 获取视频标题
        const videoTitle = getVideoTitle();

        // 创建按钮组容器
        const buttonGroup = document.createElement('div');
        buttonGroup.id = 'iwara-mpv-button-group-detail';

        // 复制按钮
        if (buttonSettings.detailPage.copy) {
            const copyButton = createButton('copy-btn', '复制视频链接', 'COPY', async () => {
                try {
                    // 从 URL 中提取视频 ID
                    const videoId = getVideoIdFromUrl();
                    if (!videoId) {
                        showNotification('❌ 无法获取视频 ID', 'error');
                        return;
                    }

                    showNotification('🔄 正在获取视频链接...', 'info');
                    const { url } = await getVideoLinkById(videoId);
                    const finalUrl = getProxiedUrl(url);
                    await navigator.clipboard.writeText(finalUrl);
                    showNotification('✅ 链接已复制到剪贴板', 'success');
                } catch (error) {
                    console.error('[Iwara Player] 复制失败:', error);
                    showNotification('❌ 复制失败: ' + error.message, 'error');
                }
            });
            buttonGroup.appendChild(copyButton);
        }

        // 新标签页播放按钮
        if (buttonSettings.detailPage.newTab) {
            const downloadButton = createButton('new-tab-btn', '在新标签页播放', 'NEW_TAB', async () => {
                try {
                    // 从 URL 中提取视频 ID
                    const videoId = getVideoIdFromUrl();
                    if (!videoId) {
                        showNotification('❌ 无法获取视频 ID', 'error');
                        return;
                    }

                    showNotification('🔄 正在获取视频链接...', 'info');
                    const { url } = await getVideoLinkById(videoId);
                    const finalUrl = getProxiedUrl(url);
                    window.open(finalUrl, '_blank');
                    showNotification('✅ 已在新标签页打开', 'success');
                } catch (error) {
                    console.error('[Iwara Player] 打开失败:', error);
                    showNotification('❌ 打开失败: ' + error.message, 'error');
                }
            });
            buttonGroup.appendChild(downloadButton);
        }

        // 画质按钮 - 固定为 540
        if (buttonSettings.detailPage.quality) {
            const qualityButton = createButton('quality-btn', '540 画质', '540', async () => {
                // 从 URL 中提取视频 ID
                const videoId = getVideoIdFromUrl();
                if (!videoId) {
                    showNotification('❌ 无法获取视频 ID', 'error');
                    return;
                }
                // 使用 540 画质播放
                playVideoById(videoId, videoTitle, '540');
            });
            buttonGroup.appendChild(qualityButton);
        }

        // 播放按钮 - 固定为 Source 画质
        if (buttonSettings.detailPage.play) {
            const playButton = createButton('play-btn', 'Source 画质', 'PLAY', playWithExternalPlayer);
            buttonGroup.appendChild(playButton);
        }

        // 只有当至少有一个按钮启用时才添加到页面
        if (buttonGroup.children.length > 0) {
            document.body.appendChild(buttonGroup);
        }
    }

    // 创建悬停按钮 (视频列表页)
    function createHoverButton(videoTeaser, videoId, videoName) {
        // 防止重复创建
        if (videoTeaser.querySelector('.iwara-mpv-button-group')) {
            return;
        }

        // 创建按钮组容器
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'iwara-mpv-button-group';

        // 复制按钮
        if (buttonSettings.listPage.copy) {
            const copyButton = createButton('iwara-mpv-action-btn copy', '复制视频链接', 'COPY', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    showNotification('🔄 正在获取视频链接...', 'info');
                    const { url } = await getVideoLinkById(videoId);
                    const finalUrl = getProxiedUrl(url);
                    await navigator.clipboard.writeText(finalUrl);
                    showNotification('✅ 链接已复制到剪贴板', 'success');
                } catch (error) {
                    console.error('[Iwara Player] 复制失败:', error);
                    showNotification('❌ 复制失败: ' + error.message, 'error');
                }
            });
            buttonGroup.appendChild(copyButton);
        }

        // 新标签页播放按钮
        if (buttonSettings.listPage.newTab) {
            const newTabButton = createButton('iwara-mpv-action-btn new-tab', '在新标签页播放', 'NEW_TAB', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    showNotification('🔄 正在获取视频链接...', 'info');
                    const { url } = await getVideoLinkById(videoId);
                    const finalUrl = getProxiedUrl(url);
                    window.open(finalUrl, '_blank');
                    showNotification('✅ 已在新标签页打开', 'success');
                } catch (error) {
                    console.error('[Iwara Player] 打开失败:', error);
                    showNotification('❌ 打开失败: ' + error.message, 'error');
                }
            });
            buttonGroup.appendChild(newTabButton);
        }

        // 画质播放按钮 - 固定为 540
        if (buttonSettings.listPage.quality) {
            const qualityButton = createButton('iwara-mpv-action-btn quality', '540 画质', '540', (e) => {
                e.preventDefault();
                e.stopPropagation();
                playVideoById(videoId, videoName, '540');
            });
            buttonGroup.appendChild(qualityButton);
        }

        // 播放按钮 - 固定为 Source 画质
        if (buttonSettings.listPage.play) {
            const playButton = createButton('iwara-mpv-hover-button', 'Source 画质', 'PLAY', (e) => {
                e.preventDefault();
                e.stopPropagation();
                playVideoById(videoId, videoName);
            });
            buttonGroup.appendChild(playButton);
        }

        // 只有当至少有一个按钮启用时才添加到页面
        if (buttonGroup.children.length > 0) {
            // 如果按钮少于4个，使用单列布局
            if (buttonGroup.children.length < 4) {
                buttonGroup.classList.add('single-column');
            }
            videoTeaser.appendChild(buttonGroup);
            return buttonGroup;
        }
        return null;
    }

    // 处理视频列表项悬停
    function handleVideoTeaserHover() {
        const videoTeasers = document.querySelectorAll('.videoTeaser');

        videoTeasers.forEach((teaser, index) => {
            // 如果已经处理过，跳过
            if (teaser.dataset.mpvProcessed) {
                return;
            }
            teaser.dataset.mpvProcessed = 'true';

            // 从 a.videoTeaser__thumbnail 的 href 获取视频ID
            const thumbnailLink = teaser.querySelector('a.videoTeaser__thumbnail');
            if (!thumbnailLink) {
                return;
            }

            const href = thumbnailLink.getAttribute('href');
            if (!href) {
                return;
            }

            // 从 href 中提取视频ID: /video/{videoId}/{title}
            const videoIdMatch = href.match(/\/video\/([^\/]+)/);
            if (!videoIdMatch) {
                return;
            }

            const videoId = videoIdMatch[1];

            // 尝试从标题元素获取视频名称
            const titleElement = teaser.querySelector('.videoTeaser__title, a[title]');
            const videoName = titleElement ? (titleElement.getAttribute('title') || titleElement.textContent.trim()) : 'Video';

            if (!videoId) {
                return;
            }

            // 创建按钮组
            const buttonGroup = createHoverButton(teaser, videoId, videoName);

            // 鼠标进入显示按钮组
            teaser.addEventListener('mouseenter', () => {
                if (!buttonGroup) return;
                buttonGroup.style.display = 'grid';
                setTimeout(() => {
                    buttonGroup.classList.add('visible');
                    // 为每个按钮添加动画效果
                    buttonGroup.querySelectorAll('button').forEach((btn, index) => {
                        setTimeout(() => {
                            btn.style.transform = 'scale(1)';
                            btn.style.opacity = '1';
                        }, index * 50);
                    });
                }, 10);
            });

            // 鼠标离开隐藏按钮组
            teaser.addEventListener('mouseleave', () => {
                if (!buttonGroup) return;
                buttonGroup.classList.remove('visible');
                buttonGroup.querySelectorAll('button').forEach(btn => {
                    btn.style.opacity = '0';
                    btn.style.transform = btn.classList.contains('iwara-mpv-hover-button') ? 'scale(0.9)' : 'scale(0.8)';
                });
                setTimeout(() => buttonGroup.style.display = 'none', 200);
            });
        });
    }

    // 移除按钮组（页面变化时）
    function removeButtonGroup() {
        const buttonGroup = document.getElementById('iwara-mpv-button-group-detail');
        if (buttonGroup) {
            buttonGroup.remove();
        }
    }

    // 刷新所有按钮（不重新加载页面）
    function refreshAllButtons() {
        // 1. 刷新视频详情页按钮
        removeButtonGroup();
        if (isVideoPage()) {
            createButtonGroup();
        }

        // 2. 刷新视频列表页按钮
        if (isVideoListPage()) {
            // 移除所有已存在的按钮组
            document.querySelectorAll('.iwara-mpv-button-group').forEach(group => {
                group.remove();
            });
            
            // 清除处理标记
            document.querySelectorAll('.videoTeaser').forEach(teaser => {
                teaser.dataset.mpvProcessed = '';
            });
            
            // 重新创建按钮组
            handleVideoTeaserHover();
        }
    }

    // 页面类型检查
    const isVideoPage = () => /\/video\/[a-zA-Z0-9]+/.test(window.location.pathname);
    const isVideoListPage = () => /\/(videos|subscriptions|playlist|search|profile)/.test(window.location.pathname) || window.location.pathname === '/';

    // 初始化
    function init() {
        console.log(`%c[Iwara Player] 脚本初始化完成`, 'color: #51cf66; font-weight: bold; font-size: 14px;',
            '\n当前播放器:', externalPlayer,
            '\n默认画质: Source',
            '\n标清画质: 540');

        // 创建右下角设置按钮
        createSettingsButton();

        // 监听URL变化（SPA路由）
        let lastUrl = location.href;
        new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                removeButtonGroup();

                // 视频详情页
                if (isVideoPage()) {
                    setTimeout(() => {
                        if (getVideoUrl()) {
                            createButtonGroup();
                        }
                    }, 1000);
                }

                // 视频列表页
                if (isVideoListPage()) {
                    setTimeout(handleVideoTeaserHover, 500);
                }
            }
        }).observe(document, { subtree: true, childList: true });

        // 监听视频元素出现（详情页）
        const videoObserver = new MutationObserver(() => {
            if (isVideoPage() && getVideoUrl() && !document.getElementById('iwara-mpv-button-group-detail')) {
                createButtonGroup();
            }
        });

        videoObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 监听列表页视频项出现
        const listObserver = new MutationObserver(() => {
            if (isVideoListPage()) {
                handleVideoTeaserHover();
            }
        });

        listObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 初次检查
        if (isVideoPage() && getVideoUrl()) {
            createButtonGroup();
        }

        if (isVideoListPage()) {
            setTimeout(() => {
                handleVideoTeaserHover();
            }, 1000);
        }
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
