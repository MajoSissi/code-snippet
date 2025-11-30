#!/bin/bash

# ======================================================
# 脚本名称: git-reset.sh
# 功能: 清空当前目录的 Git 历史并重新初始化提交
# 适用环境: 通用 (Linux/macOS/Windows Git Bash)
# ======================================================

# 定义颜色代码，用于美化输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 清屏 (可选)
# clear

echo -e "${YELLOW}######################################################${NC}"
echo -e "${YELLOW}#               Git 项目重置工具                     #${NC}"
echo -e "${YELLOW}######################################################${NC}"
echo -e "${RED}警告: 此操作将彻底重置当前项目的 Git 历史！${NC}"
echo -e "执行步骤如下:"
echo -e "1. 获取当前分支名称"
echo -e "2. 创建临时孤儿分支 (无历史记录)"
echo -e "3. 提交当前所有文件"
echo -e "4. 删除旧分支并重命名新分支"
echo -e "5. 结果：保留最新代码，清空历史提交"
echo ""

# 1. 交互确认
read -p "请确认是否继续? (输入 y 并回车以继续, 其他键取消): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo -e "${RED}操作已取消。${NC}"
    exit 1
fi

echo ""

# 2. 检查是否在 Git 仓库中
if [ ! -d ".git" ]; then
    echo -e "${RED}错误: 当前目录不是 Git 仓库，无法执行分支重置操作。${NC}"
    echo -e "请先执行 git init 或切换到正确的目录。"
    exit 1
fi

# 获取当前分支名称
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
    # 尝试兼容旧版本 Git
    CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)
fi

if [ -z "$CURRENT_BRANCH" ]; then
    echo -e "${RED}无法检测到当前分支名称，请确保您在有效的分支上。${NC}"
    exit 1
fi

echo -e "${GREEN}当前分支为: ${CURRENT_BRANCH}${NC}"

# 3. 使用孤儿分支策略重置
echo -e "${GREEN}正在创建临时孤儿分支 (temp_reset_branch)...${NC}"
# --orphan 创建一个无历史记录的分支
git checkout --orphan temp_reset_branch

echo -e "${GREEN}正在添加所有文件...${NC}"
git add -A

echo -e "${GREEN}正在执行新提交...${NC}"
git commit -m "Initial commit"

# 4. 替换旧分支
echo -e "${GREEN}正在删除旧分支 (${CURRENT_BRANCH})...${NC}"
git branch -D "$CURRENT_BRANCH"

echo -e "${GREEN}正在将当前分支重命名为 ${CURRENT_BRANCH}...${NC}"
git branch -m "$CURRENT_BRANCH"

echo ""
echo -e "${YELLOW}######################################################${NC}"
echo -e "${GREEN}                 重置操作成功完成!                   ${NC}"
echo -e "${YELLOW}######################################################${NC}"
echo -e "当前状态:"
git log --oneline -n 1
echo ""
echo -e "${YELLOW}注意: 如果你需要将更改推送到远程仓库，你需要强制推送。${NC}"
echo -e "${YELLOW}######################################################${NC}"

# 5. 推送确认
read -p "是否立即强制推送到远程仓库 (origin ${CURRENT_BRANCH})? (输入 y 确认推送, 其他键跳过): " push_confirm
if [[ "$push_confirm" == "y" || "$push_confirm" == "Y" ]]; then
    echo -e "${GREEN}正在强制推送到 origin ${CURRENT_BRANCH}...${NC}"
    git push -f origin "$CURRENT_BRANCH"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}推送成功！${NC}"
    else
        echo -e "${RED}推送失败，请检查网络或远程仓库权限。${NC}"
    fi
else
    echo -e "${YELLOW}已跳过推送。${NC}"
    echo -e "你可以稍后手动执行: git push -f origin ${CURRENT_BRANCH}"
fi

sleep 5