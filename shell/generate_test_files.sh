#!/bin/bash

# 生成测试文件脚本
# 用于测试文件分组工具

echo "=================================="
echo "  生成测试文件"
echo "=================================="
echo ""

# 创建测试目录（如果不存在）
TEST_DIR="test_files"
if [ -d "$TEST_DIR" ]; then
    echo "⚠️  测试目录已存在: $TEST_DIR"
    read -p "是否删除并重新创建? (y/n): " choice
    if [ "$choice" = "y" ] || [ "$choice" = "Y" ]; then
        rm -rf "$TEST_DIR"
        echo "✓ 已删除旧目录"
    else
        echo "✗ 取消操作"
        exit 0
    fi
fi

mkdir -p "$TEST_DIR"
cd "$TEST_DIR" || exit 1

echo ""
echo "开始生成测试文件..."
echo ""

# ==================== 视频文件 ====================
echo "📹 生成视频文件..."

# 组1: 电影系列
touch "哈利波特与魔法石.mp4"
touch "哈利波特与密室.mp4"
touch "哈利波特与阿兹卡班的囚徒.mkv"
touch "哈利波特与火焰杯.avi"

# 组2: 电视剧系列
touch "[权力的游戏]S01E01.mp4"
touch "[权力的游戏]S01E02.mp4"
touch "[权力的游戏]S01E03.mkv"

# 组3: 动画系列
touch "进击的巨人_第01话.mp4"
touch "进击的巨人_第02话.mp4"
touch "进击的巨人_第03话.mp4"

# 组4: 教程系列
touch "Python教程-01-基础入门.mp4"
touch "Python教程-02-数据类型.mp4"
touch "Python教程-03-函数与类.mkv"

# 单独文件
touch "独立电影.mp4"
touch "纪录片.avi"
touch "演唱会.mkv"

echo "  ✓ 已创建 18 个视频文件"

# ==================== 音频文件 ====================
echo "🎵 生成音频文件..."

# 组5: 专辑系列
touch "Taylor Swift - Lover - 01.mp3"
touch "Taylor Swift - Lover - 02.mp3"
touch "Taylor Swift - Lover - 03.mp3"

# 组6: 播客系列
touch "【播客】科技日报_20240101.mp3"
touch "【播客】科技日报_20240102.mp3"
touch "【播客】科技日报_20240103.mp3"

# 单独文件
touch "单曲.mp3"
touch "有声书.wav"

echo "  ✓ 已创建 8 个音频文件"

# ==================== 图片文件 ====================
echo "🖼️  生成图片文件..."

# 组7: 旅行照片
touch "2024北京旅行-故宫.jpg"
touch "2024北京旅行-长城.jpg"
touch "2024北京旅行-颐和园.png"

# 组8: 产品图
touch "Product_iPhone_01.jpg"
touch "Product_iPhone_02.jpg"
touch "Product_iPhone_03.png"

# 组9: 截图系列
touch "Screenshot_2024-01-01_10-00.png"
touch "Screenshot_2024-01-01_10-30.png"
touch "Screenshot_2024-01-01_11-00.png"

# 单独文件
touch "头像.jpg"
touch "壁纸.png"

echo "  ✓ 已创建 11 个图片文件"

# ==================== 文档文件 ====================
echo "📄 生成文档文件..."

# 组10: 报告系列
touch "2024年度财务报告-Q1.pdf"
touch "2024年度财务报告-Q2.pdf"
touch "2024年度财务报告-Q3.pdf"

# 组11: 会议记录
touch "会议记录_2024-01-15.docx"
touch "会议记录_2024-02-15.docx"
touch "会议记录_2024-03-15.docx"

# 组12: 项目文档
touch "项目计划书v1.0.docx"
touch "项目计划书v1.1.docx"
touch "项目计划书v2.0.docx"

# 单独文件
touch "简历.pdf"
touch "笔记.txt"
touch "README.md"

echo "  ✓ 已创建 12 个文档文件"

# ==================== 压缩文件 ====================
echo "📦 生成压缩文件..."

# 组13: 备份系列
touch "backup_2024-01-01.zip"
touch "backup_2024-02-01.zip"
touch "backup_2024-03-01.zip"

# 组14: 项目压缩包
touch "Project_Source_v1.0.zip"
touch "Project_Source_v1.1.zip"
touch "Project_Source_v2.0.rar"

# 单独文件
touch "archive.7z"
touch "data.tar.gz"

echo "  ✓ 已创建 8 个压缩文件"

# ==================== 混合文件（不同类型但有相似名称）====================
echo "🔀 生成混合类型文件..."

touch "教程合集-Part1.mp4"
touch "教程合集-Part1.pdf"
touch "教程合集-Part2.mp4"
touch "教程合集-Part2.pdf"

touch "年度总结2024.docx"
touch "年度总结2024_演示.pptx"

echo "  ✓ 已创建 6 个混合类型文件"

# ==================== 带特殊字符的文件名 ====================
echo "🔤 生成特殊字符文件名..."

touch "【重要】项目资料-v1.pdf"
touch "【重要】项目资料-v2.pdf"

touch "(2024)新年晚会_上半场.mp4"
touch "(2024)新年晚会_下半场.mp4"

echo "  ✓ 已创建 4 个特殊字符文件"

# ==================== 统计信息 ====================
echo ""
echo "=================================="
echo "  生成完成！"
echo "=================================="
echo ""

total_files=$(find . -type f | wc -l)
echo "📊 统计信息:"
echo "  总文件数: $total_files"
echo ""
echo "  视频文件: $(find . -name "*.mp4" -o -name "*.avi" -o -name "*.mkv" | wc -l)"
echo "  音频文件: $(find . -name "*.mp3" -o -name "*.wav" | wc -l)"
echo "  图片文件: $(find . -name "*.jpg" -o -name "*.png" | wc -l)"
echo "  文档文件: $(find . -name "*.pdf" -o -name "*.docx" -o -name "*.txt" -o -name "*.md" -o -name "*.pptx" | wc -l)"
echo "  压缩文件: $(find . -name "*.zip" -o -name "*.rar" -o -name "*.7z" -o -name "*.tar.gz" | wc -l)"
echo ""
echo "测试文件已生成到: $(pwd)"
echo ""
echo "💡 使用提示:"
echo "  1. cd $TEST_DIR"
echo "  2. node ../group_videos.js"
echo ""
