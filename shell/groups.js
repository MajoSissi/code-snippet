const fs = require('fs');
const path = require('path');
const readline = require('readline');
// ==================== 配置区域 ====================
// 可根据需要修改以下配置

// 获取当前目录
const currentDir = __dirname;

// 文件类型定义 (可自定义添加更多类型)
// 注意: 扩展名可以写 '.mp4' 或 'mp4'，系统会自动处理
const FILE_TYPES = {
    video: {
        name: '视频文件',
        extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg']
    },
    audio: {
        name: '音频文件',
        extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'ape']
    },
    image: {
        name: '图片文件',
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff']
    },
    document: {
        name: '文档文件',
        extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md']
    },
    archive: {
        name: '压缩文件',
        extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
    },
    // 在此添加更多自定义类型...
    // custom: {
    //     name: '自定义类型',
    //     extensions: ['ext1', 'ext2']  // 可以不写点号
    // }
};

// 默认文件类型 (对应 FILE_TYPES 的键名)
const DEFAULT_FILE_TYPE = 'video';

// 默认相似度检测模式: 'prefix'(前缀), 'suffix'(后缀), 'full'(全文件名)
const DEFAULT_SIMILARITY_MODE = 'prefix';

// 默认相似度阈值: 10-90 (对应 10%-90%)
const DEFAULT_SIMILARITY_THRESHOLD = 50;

// 主分组目录名称 (所有分组将创建在此目录下)
const OUTPUT_DIR_NAME = 'Groups';

// 未匹配文件目录名称 (无法分组的文件将放在此目录)
const UNMATCHED_DIR_NAME = '#无匹配';

// 备份记录文件名称 (用于恢复操作)
const BACKUP_FILE_NAME = 'group_record.json';

// 排除的目录列表 (这些目录不会被扫描)
// 注意: OUTPUT_DIR_NAME 会在运行时被添加到排除列表
const EXCLUDED_DIRS_BASE = ['node_modules', '.git'];

// ==================== 配置区域结束 ====================

// ANSI 颜色代码
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    red: '\x1b[31m',
};

// 标准化扩展名（确保以点开头）
function normalizeExtensions(extensions) {
    return extensions.map(ext => ext.startsWith('.') ? ext.toLowerCase() : '.' + ext.toLowerCase());
}

// 当前配置
let fileExtensions = normalizeExtensions(FILE_TYPES[DEFAULT_FILE_TYPE].extensions); // 当前使用的文件扩展名
let similarityMode = DEFAULT_SIMILARITY_MODE;
let similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD / 100;

// 动态生成排除目录列表
const EXCLUDED_DIRS = [...EXCLUDED_DIRS_BASE, OUTPUT_DIR_NAME];

// 处理文件名冲突，生成唯一文件名
function getUniqueFileName(dirPath, fileName) {
    const ext = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, ext);
    let uniqueName = fileName;
    let counter = 1;
    
    // 如果文件名已存在，添加数字后缀
    while (fs.existsSync(path.join(dirPath, uniqueName))) {
        uniqueName = `${nameWithoutExt} (${counter})${ext}`;
        counter++;
    }
    
    return uniqueName;
}

// 递归获取所有文件
function getVideoFiles(dir = currentDir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // 跳过排除的目录,避免重复处理
            if (!EXCLUDED_DIRS.includes(file)) {
                getVideoFiles(filePath, fileList);
            }
        } else {
            // 如果 fileExtensions 为 null，匹配所有文件
            if (fileExtensions === null) {
                const relativePath = path.relative(currentDir, filePath);
                fileList.push(relativePath);
            } else {
                const ext = path.extname(file).toLowerCase();
                if (fileExtensions.includes(ext)) {
                    // 存储相对于当前目录的路径
                    const relativePath = path.relative(currentDir, filePath);
                    fileList.push(relativePath);
                }
            }
        }
    });
    
    return fileList;
}

// 计算两个字符串的公共前缀长度
function getCommonPrefixLength(str1, str2) {
    let i = 0;
    const minLen = Math.min(str1.length, str2.length);
    while (i < minLen && str1[i] === str2[i]) {
        i++;
    }
    return i;
}

// 计算两个字符串的公共后缀长度
function getCommonSuffixLength(str1, str2) {
    let i = 0;
    const len1 = str1.length;
    const len2 = str2.length;
    const minLen = Math.min(len1, len2);
    
    while (i < minLen && str1[len1 - 1 - i] === str2[len2 - 1 - i]) {
        i++;
    }
    return i;
}

// 计算两个字符串的最长公共子序列长度 (用于整个文件名相似度)
function getLCSLength(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    return dp[m][n];
}

// 获取公共前缀
function getCommonPrefix(str1, str2) {
    const len = getCommonPrefixLength(str1, str2);
    return str1.substring(0, len).trim();
}

// 获取公共后缀
function getCommonSuffix(str1, str2) {
    const len = getCommonSuffixLength(str1, str2);
    return str1.substring(str1.length - len).trim();
}

// 获取多个文件的最长公共前缀
function getCommonPrefixForGroup(files) {
    if (files.length === 0) return '';
    if (files.length === 1) return path.parse(files[0]).name;
    
    // 获取所有文件名(不含扩展名)
    const names = files.map(f => path.parse(f).name);
    
    if (similarityMode === 'prefix') {
        // 从第一个文件名开始,逐个比较找出公共前缀
        let commonPrefix = names[0];
        for (let i = 1; i < names.length; i++) {
            const prefixLen = getCommonPrefixLength(commonPrefix, names[i]);
            commonPrefix = commonPrefix.substring(0, prefixLen);
        }
        return commonPrefix.trim();
    } else if (similarityMode === 'suffix') {
        // 找出公共后缀
        let commonSuffix = names[0];
        for (let i = 1; i < names.length; i++) {
            const suffixLen = getCommonSuffixLength(commonSuffix, names[i]);
            commonSuffix = commonSuffix.substring(commonSuffix.length - suffixLen);
        }
        return commonSuffix.trim();
    } else {
        // 对于全文件名模式，使用第一个文件的名称
        return names[0];
    }
}

// 判断两个文件名是否满足相似度条件
function isSimilar(file1, file2) {
    const name1 = path.parse(file1).name;
    const name2 = path.parse(file2).name;
    
    let commonLength = 0;
    let minLen = Math.min(name1.length, name2.length);
    
    if (similarityMode === 'prefix') {
        // 前缀模式：计算公共前缀长度
        commonLength = getCommonPrefixLength(name1, name2);
    } else if (similarityMode === 'suffix') {
        // 后缀模式：计算公共后缀长度
        commonLength = getCommonSuffixLength(name1, name2);
    } else if (similarityMode === 'full') {
        // 全文件名模式：使用最长公共子序列
        commonLength = getLCSLength(name1, name2);
        minLen = Math.min(name1.length, name2.length);
    }
    
    // 计算阈值
    const threshold = Math.ceil(minLen * similarityThreshold);
    
    return commonLength >= threshold;
}

// 使用贪心算法进行分组(基于相似度阈值)
function groupFiles(files) {
    const groups = [];
    const used = new Set();
    
    // 为每对文件计算相似度
    const pairs = [];
    for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
            if (isSimilar(files[i], files[j])) {
                const file1 = path.parse(files[i]).name;
                const file2 = path.parse(files[j]).name;
                
                let commonLength = 0;
                let commonStr = '';
                
                if (similarityMode === 'prefix') {
                    commonLength = getCommonPrefixLength(file1, file2);
                    commonStr = getCommonPrefix(file1, file2);
                } else if (similarityMode === 'suffix') {
                    commonLength = getCommonSuffixLength(file1, file2);
                    commonStr = getCommonSuffix(file1, file2);
                } else {
                    commonLength = getLCSLength(file1, file2);
                    commonStr = file1; // 对于全文件名模式，使用第一个文件名
                }
                
                pairs.push({
                    file1: files[i],
                    file2: files[j],
                    commonLength: commonLength,
                    commonStr: commonStr
                });
            }
        }
    }
    
    // 按公共长度降序排序
    pairs.sort((a, b) => b.commonLength - a.commonLength);
    
    // 贪心分组
    for (const pair of pairs) {
        if (!used.has(pair.file1) && !used.has(pair.file2)) {
            const group = {
                files: [pair.file1, pair.file2]
            };
            
            // 尝试将其他未使用的文件添加到此组
            for (const file of files) {
                if (!used.has(file) && file !== pair.file1 && file !== pair.file2) {
                    // 检查文件是否与组中的文件相似
                    const isSimilarToGroup = group.files.some(groupFile => isSimilar(file, groupFile));
                    
                    if (isSimilarToGroup) {
                        group.files.push(file);
                    }
                }
            }
            
            // 计算整个组的公共前缀
            group.prefix = getCommonPrefixForGroup(group.files);
            
            groups.push(group);
            group.files.forEach(f => used.add(f));
        }
    }
    
    // 处理单个文件
    const singleFiles = files.filter(f => !used.has(f));
    
    return { groups, singleFiles };
}

// 创建readline接口
function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// 获取用户输入
function askQuestion(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// 交互式选择文件类型
async function selectFileType() {
    const rl = createReadlineInterface();
    
    console.log(`\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  📁 文件类型选择${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    console.log('请选择要分组的文件类型:\n');
    
    const typeKeys = Object.keys(FILE_TYPES);
    typeKeys.forEach((key, index) => {
        const type = FILE_TYPES[key];
        const exts = type.extensions.slice(0, 5).join(', ');
        const more = type.extensions.length > 5 ? '...' : '';
        console.log(`${colors.yellow}${index + 1}.${colors.reset} ${colors.bright}${type.name}${colors.reset} ${colors.blue}(${exts}${more})${colors.reset}`);
    });
    console.log(`${colors.yellow}0.${colors.reset} ${colors.bright}所有文件${colors.reset} ${colors.blue}(匹配所有非目录文件)${colors.reset}\n`);
    console.log(`${colors.green}默认: 1 (${FILE_TYPES[DEFAULT_FILE_TYPE].name})${colors.reset}\n`);
    
    let choice = await askQuestion(rl, `请输入选择 (0-${typeKeys.length}): `);
    if (!choice) choice = '1';
    
    rl.close();
    
    const choiceNum = parseInt(choice);
    
    if (choiceNum === 0) {
        // 匹配所有文件
        fileExtensions = null; // null 表示匹配所有文件
        console.log(`\n${colors.green}✓ 已选择: 所有文件类型${colors.reset}\n`);
    } else if (choiceNum > 0 && choiceNum <= typeKeys.length) {
        const selectedKey = typeKeys[choiceNum - 1];
        const selectedType = FILE_TYPES[selectedKey];
        fileExtensions = normalizeExtensions(selectedType.extensions);
        console.log(`\n${colors.green}✓ 已选择: ${selectedType.name}${colors.reset}`);
        console.log(`${colors.blue}扩展名: ${selectedType.extensions.join(', ')}${colors.reset}\n`);
    } else {
        console.log(`\n${colors.yellow}⚠ 无效的选择，使用默认类型: ${FILE_TYPES[DEFAULT_FILE_TYPE].name}${colors.reset}\n`);
        fileExtensions = normalizeExtensions(FILE_TYPES[DEFAULT_FILE_TYPE].extensions);
    }
}

// 交互式配置
async function interactiveConfig() {
    const rl = createReadlineInterface();
    
    console.log(`${colors.magenta}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}  ⚙️  分组配置${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    // 选择相似度检测模式
    console.log('请选择相似度检测模式:\n');
    console.log(`${colors.yellow}1.${colors.reset} ${colors.bright}前缀相似度 (prefix)${colors.reset} - 根据文件名开头部分判断`);
    console.log(`${colors.yellow}2.${colors.reset} ${colors.bright}后缀相似度 (suffix)${colors.reset} - 根据文件名结尾部分判断`);
    console.log(`${colors.yellow}3.${colors.reset} ${colors.bright}整个文件名相似度 (full)${colors.reset} - 根据整个文件名的相似程度判断`);
    console.log(`${colors.green}默认: 1 (前缀相似度)${colors.reset}\n`);
    
    let modeInput = await askQuestion(rl, '请输入选择 (1-3): ');
    if (!modeInput) modeInput = '1';
    
    switch (modeInput) {
        case '2':
            similarityMode = 'suffix';
            break;
        case '3':
            similarityMode = 'full';
            break;
        case '1':
        case '':
        default:
            similarityMode = 'prefix';
            break;
    }
    
    // 设置相似度阈值
    const modeNames = {
        'prefix': '前缀',
        'suffix': '后缀',
        'full': '整个文件名'
    };
    
    console.log(`\n${colors.green}✓ 已选择: ${modeNames[similarityMode]}相似度模式${colors.reset}\n`);
    console.log('请输入相似度阈值 (10-90):\n');
    console.log(`${colors.blue}• 30${colors.reset} = 30% 相似即可归为一组 ${colors.yellow}(宽松)${colors.reset}`);
    console.log(`${colors.blue}• 50${colors.reset} = 50% 相似即可归为一组 ${colors.yellow}(中等)${colors.reset}`);
    console.log(`${colors.blue}• 70${colors.reset} = 70% 相似即可归为一组 ${colors.yellow}(严格)${colors.reset}`);
    console.log(`${colors.green}默认: ${DEFAULT_SIMILARITY_THRESHOLD}${colors.reset}\n`);
    
    let thresholdInput = await askQuestion(rl, '请输入相似度阈值: ');
    if (!thresholdInput) thresholdInput = String(DEFAULT_SIMILARITY_THRESHOLD);
    
    const threshold = parseInt(thresholdInput);
    if (threshold >= 10 && threshold <= 90) {
        similarityThreshold = threshold / 100;
    } else {
        console.log(`${colors.yellow}⚠ 无效的阈值，使用默认值: ${DEFAULT_SIMILARITY_THRESHOLD}${colors.reset}`);
        similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD / 100;
    }
    
    rl.close();
    
    console.log(`\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  ✓ 配置完成${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}相似度模式: ${modeNames[similarityMode]}${colors.reset}`);
    console.log(`${colors.blue}相似度阈值: ${(similarityThreshold * 100).toFixed(0)}%${colors.reset}\n`);
}

// 保存文件移动记录
function saveBackupRecord(records) {
    const backupFile = path.join(currentDir, BACKUP_FILE_NAME);
    fs.writeFileSync(backupFile, JSON.stringify(records, null, 2), 'utf-8');
    console.log(`\n备份记录已保存到: ${backupFile}`);
}

// 读取备份记录
function loadBackupRecord() {
    const backupFile = path.join(currentDir, BACKUP_FILE_NAME);
    if (!fs.existsSync(backupFile)) {
        return null;
    }
    try {
        const content = fs.readFileSync(backupFile, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('读取备份文件失败:', error.message);
        return null;
    }
}

// 恢复文件到原始位置
function restoreFiles() {
    const records = loadBackupRecord();
    
    if (!records || records.length === 0) {
        console.log(`${colors.red}✗ 未找到备份记录文件 ${BACKUP_FILE_NAME} 或记录为空${colors.reset}`);
        return;
    }
    
    console.log(`${colors.cyan}找到 ${colors.bright}${records.length}${colors.reset}${colors.cyan} 条移动记录${colors.reset}\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    records.forEach(record => {
        const { from, to } = record;
        const srcPath = path.join(currentDir, to);
        const destPath = path.join(currentDir, from);
        
        try {
            if (fs.existsSync(srcPath)) {
                // 确保目标目录存在
                const destDir = path.dirname(destPath);
                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir, { recursive: true });
                }
                
                fs.renameSync(srcPath, destPath);
                console.log(`${colors.green}✓ 恢复: ${colors.reset}${to} ${colors.cyan}→${colors.reset} ${from}`);
                successCount++;
            } else {
                console.log(`${colors.red}✗ 文件不存在: ${colors.reset}${to}`);
                failCount++;
            }
        } catch (error) {
            console.log(`${colors.red}✗ 恢复失败: ${colors.reset}${to} ${colors.red}- ${error.message}${colors.reset}`);
            failCount++;
        }
    });
    
    console.log(`\n${colors.bright}恢复完成! ${colors.green}成功: ${successCount}${colors.reset}, ${colors.red}失败: ${failCount}${colors.reset}`);
    
    // 删除空的分组目录
    const groupsDir = path.join(currentDir, OUTPUT_DIR_NAME);
    if (fs.existsSync(groupsDir)) {
        try {
            const dirs = fs.readdirSync(groupsDir);
            dirs.forEach(dir => {
                const dirPath = path.join(groupsDir, dir);
                if (fs.statSync(dirPath).isDirectory()) {
                    const files = fs.readdirSync(dirPath);
                    if (files.length === 0) {
                        fs.rmdirSync(dirPath);
                        console.log(`${colors.yellow}删除空目录: ${colors.reset}${dir}`);
                    }
                }
            });
            
            const remainingFiles = fs.readdirSync(groupsDir);
            if (remainingFiles.length === 0) {
                fs.rmdirSync(groupsDir);
                console.log(`${colors.yellow}删除空的 ${OUTPUT_DIR_NAME} 目录${colors.reset}`);
            }
        } catch (error) {
            console.error(`${colors.red}清理目录时出错: ${error.message}${colors.reset}`);
        }
    }
    
    // 删除备份文件
    const backupFile = path.join(currentDir, BACKUP_FILE_NAME);
    if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile);
        console.log(`${colors.green}✓ 已删除备份记录文件${colors.reset}`);
    }
}

// 创建目录并移动文件
function organizeFiles() {
    const videoFiles = getVideoFiles();
    
    if (videoFiles.length === 0) {
        console.log(`${colors.red}✗ 当前目录没有找到匹配的文件${colors.reset}`);
        return;
    }
    
    console.log(`\n${colors.cyan}找到 ${colors.bright}${videoFiles.length}${colors.reset}${colors.cyan} 个文件${colors.reset}`);
    console.log(`${colors.cyan}相似度模式: ${colors.bright}${similarityMode}${colors.reset}`);
    console.log(`${colors.cyan}相似度阈值: ${colors.bright}${(similarityThreshold * 100).toFixed(0)}%${colors.reset}\n`);
    
    const { groups, singleFiles } = groupFiles(videoFiles);
    
    // 创建分组目录
    const groupsDir = path.join(currentDir, OUTPUT_DIR_NAME);
    if (!fs.existsSync(groupsDir)) {
        fs.mkdirSync(groupsDir);
    }
    
    // 记录所有文件移动操作
    const moveRecords = [];
    
    // 处理分组文件
    console.log(`\n${colors.green}${colors.bright}创建 ${groups.length} 个分组:${colors.reset}`);
    groups.forEach((group, index) => {
        // 清理前缀作为目录名(移除文件系统不允许的特殊字符)
        let dirName = group.prefix.replace(/[<>:"/\\|?*]/g, '_').trim();
        // 移除末尾的特殊符号(如【、-、_、空格、括号等)
        dirName = dirName.replace(/[\s\-_~!@#$%^&*+=`|;:'"<,.?/\\【『「〈《（([{]+$/, '').trim();
        if (!dirName) {
            dirName = `Group_${index + 1}`;
        }
        
        const groupDir = path.join(groupsDir, dirName);
        if (!fs.existsSync(groupDir)) {
            fs.mkdirSync(groupDir, { recursive: true });
        }
        
        console.log(`\n${colors.bright}组: ${colors.cyan}${dirName}${colors.reset} ${colors.yellow}(${group.files.length} 个文件)${colors.reset}`);
        group.files.forEach(file => {
            const srcPath = path.join(currentDir, file);
            const fileName = path.basename(file);
            
            // 检查并处理文件名冲突
            const uniqueFileName = getUniqueFileName(groupDir, fileName);
            const destPath = path.join(groupDir, uniqueFileName);
            const destRelative = path.relative(currentDir, destPath);
            
            // 记录移动操作
            moveRecords.push({
                from: file,
                to: destRelative
            });
            
            fs.renameSync(srcPath, destPath);
            
            // 如果文件名被修改，显示提示
            if (uniqueFileName !== fileName) {
                console.log(`  ${colors.green}→${colors.reset} ${file} ${colors.yellow}→ ${uniqueFileName}${colors.reset}`);
            } else {
                console.log(`  ${colors.green}→${colors.reset} ${file}`);
            }
        });
    });
    
    // 处理单个文件
    if (singleFiles.length > 0) {
        console.log(`\n${colors.yellow}${colors.bright}创建"${UNMATCHED_DIR_NAME}"目录 (${singleFiles.length} 个文件):${colors.reset}`);
        const singleDir = path.join(groupsDir, UNMATCHED_DIR_NAME);
        if (!fs.existsSync(singleDir)) {
            fs.mkdirSync(singleDir, { recursive: true });
        }
        
        singleFiles.forEach(file => {
            const srcPath = path.join(currentDir, file);
            const fileName = path.basename(file);
            
            // 检查并处理文件名冲突
            const uniqueFileName = getUniqueFileName(singleDir, fileName);
            const destPath = path.join(singleDir, uniqueFileName);
            const destRelative = path.relative(currentDir, destPath);
            
            // 记录移动操作
            moveRecords.push({
                from: file,
                to: destRelative
            });
            
            fs.renameSync(srcPath, destPath);
            
            // 如果文件名被修改，显示提示
            if (uniqueFileName !== fileName) {
                console.log(`  ${colors.yellow}→${colors.reset} ${file} ${colors.yellow}→ ${uniqueFileName}${colors.reset}`);
            } else {
                console.log(`  ${colors.yellow}→${colors.reset} ${file}`);
            }
        });
    }
    
    // 保存移动记录
    saveBackupRecord(moveRecords);
    
    console.log(`\n${colors.green}${colors.bright}✓ 文件分组完成!${colors.reset}`);
}

// 二次匹配单文件到已有分组
async function rematchSingleFiles() {
    let groupsDir = path.join(currentDir, OUTPUT_DIR_NAME);
    
    // 检查目录是否存在
    if (!fs.existsSync(groupsDir)) {
        console.log(`${colors.yellow}未找到默认分组目录"${OUTPUT_DIR_NAME}"${colors.reset}\n`);
        
        // 列出当前目录下的所有目录
        const allDirs = fs.readdirSync(currentDir)
            .filter(item => {
                const itemPath = path.join(currentDir, item);
                return fs.statSync(itemPath).isDirectory() && 
                       !EXCLUDED_DIRS.includes(item);
            });
        
        if (allDirs.length === 0) {
            console.log(`${colors.red}✗ 当前目录下没有找到任何可用的目录${colors.reset}`);
            return;
        }
        
        console.log(`${colors.cyan}当前目录下的可用目录:${colors.reset}\n`);
        allDirs.forEach((dir, index) => {
            console.log(`${colors.yellow}${index + 1}.${colors.reset} ${dir}`);
        });
        console.log('');
        
        const rl = createReadlineInterface();
        const choice = await askQuestion(rl, '请选择分组目录 (输入序号): ');
        rl.close();
        
        const dirIndex = parseInt(choice) - 1;
        if (dirIndex < 0 || dirIndex >= allDirs.length || isNaN(dirIndex)) {
            console.log(`${colors.red}✗ 无效的选择${colors.reset}`);
            return;
        }
        
        groupsDir = path.join(currentDir, allDirs[dirIndex]);
        console.log(`\n${colors.green}✓ 已选择目录: ${colors.bright}${allDirs[dirIndex]}${colors.reset}\n`);
    }
    
    const singleDir = path.join(groupsDir, UNMATCHED_DIR_NAME);
    
    if (!fs.existsSync(singleDir)) {
        console.log(`${colors.red}✗ 未找到"${UNMATCHED_DIR_NAME}"目录${colors.reset}`);
        return;
    }
    
    // 获取单文件目录中的所有视频文件
    const singleFiles = fs.readdirSync(singleDir)
        .filter(file => {
            // 如果 fileExtensions 为 null，匹配所有文件
            if (fileExtensions === null) {
                return true;
            }
            const ext = path.extname(file).toLowerCase();
            return fileExtensions.includes(ext);
        });
    
    if (singleFiles.length === 0) {
        console.log(`${colors.red}✗ "${UNMATCHED_DIR_NAME}"目录中没有文件${colors.reset}`);
        return;
    }
    
    // 获取所有分组目录（排除单文件目录）
    const groupDirs = fs.readdirSync(groupsDir)
        .filter(dir => {
            const dirPath = path.join(groupsDir, dir);
            return fs.statSync(dirPath).isDirectory() && dir !== UNMATCHED_DIR_NAME;
        });
    
    if (groupDirs.length === 0) {
        console.log(`${colors.red}✗ 没有找到其他分组目录${colors.reset}`);
        return;
    }
    
    console.log(`\n${colors.cyan}找到 ${colors.bright}${singleFiles.length}${colors.reset}${colors.cyan} 个单文件需要重新匹配${colors.reset}`);
    console.log(`${colors.cyan}找到 ${colors.bright}${groupDirs.length}${colors.reset}${colors.cyan} 个分组目录${colors.reset}\n`);
    
    let movedCount = 0;
    const moveRecords = [];
    
    // 对每个单文件进行匹配
    singleFiles.forEach(file => {
        const fileName = path.parse(file).name;
        let bestMatch = null;
        let bestSimilarity = 0;
        
        // 与每个分组目录名进行相似度比较
        groupDirs.forEach(groupDir => {
            let similarity = 0;
            
            if (similarityMode === 'prefix') {
                const commonLen = getCommonPrefixLength(fileName, groupDir);
                similarity = commonLen / Math.min(fileName.length, groupDir.length);
            } else if (similarityMode === 'suffix') {
                const commonLen = getCommonSuffixLength(fileName, groupDir);
                similarity = commonLen / Math.min(fileName.length, groupDir.length);
            } else if (similarityMode === 'full') {
                const lcsLen = getLCSLength(fileName, groupDir);
                similarity = lcsLen / Math.min(fileName.length, groupDir.length);
            }
            
            // 如果相似度超过阈值且是最佳匹配
            if (similarity >= similarityThreshold && similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = groupDir;
            }
        });
        
        // 如果找到匹配的分组
        if (bestMatch) {
            const srcPath = path.join(singleDir, file);
            const groupPath = path.join(groupsDir, bestMatch);
            
            // 检查并处理文件名冲突
            const uniqueFileName = getUniqueFileName(groupPath, file);
            const destPath = path.join(groupPath, uniqueFileName);
            const srcRelative = path.relative(currentDir, srcPath);
            const destRelative = path.relative(currentDir, destPath);
            
            try {
                fs.renameSync(srcPath, destPath);
                console.log(`${colors.green}✓ 移动: ${colors.reset}${file}`);
                console.log(`  ${colors.cyan}→ 目标分组:${colors.reset} ${bestMatch}`);
                console.log(`  ${colors.cyan}→ 相似度:${colors.reset} ${colors.bright}${(bestSimilarity * 100).toFixed(1)}%${colors.reset}`);
                
                // 如果文件名被修改，显示提示
                if (uniqueFileName !== file) {
                    console.log(`  ${colors.yellow}→ 重命名为:${colors.reset} ${uniqueFileName}`);
                }
                console.log('');
                
                moveRecords.push({
                    from: srcRelative,
                    to: destRelative
                });
                
                movedCount++;
            } catch (error) {
                console.log(`${colors.red}✗ 移动失败: ${colors.reset}${file} ${colors.red}- ${error.message}${colors.reset}\n`);
            }
        } else {
            console.log(`${colors.yellow}✗ 未找到匹配: ${colors.reset}${file} ${colors.yellow}(相似度未达到阈值)${colors.reset}\n`);
        }
    });
    
    console.log(`\n${colors.bright}二次匹配完成! ${colors.green}成功移动: ${movedCount}/${singleFiles.length}${colors.reset}`);
    
    // 如果单文件目录为空，删除它
    const remainingFiles = fs.readdirSync(singleDir);
    if (remainingFiles.length === 0) {
        fs.rmdirSync(singleDir);
        console.log(`已删除空的"${UNMATCHED_DIR_NAME}"目录`);
    }
    
    // 更新备份记录
    if (moveRecords.length > 0) {
        const existingRecords = loadBackupRecord() || [];
        saveBackupRecord([...existingRecords, ...moveRecords]);
    }
}

// 主函数
async function main() {
    try {
        // 第一步：选择操作
        const rl = createReadlineInterface();
        
        console.log(`\n${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.bright}${colors.cyan}  🚀 文件分组工具${colors.reset}`);
        console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
        
        console.log('请选择操作:\n');
        console.log(`${colors.yellow}1.${colors.reset} ${colors.bright}开始分组${colors.reset}`);
        console.log(`${colors.yellow}2.${colors.reset} ${colors.bright}二次匹配单文件到已有分组${colors.reset}`);
        console.log(`${colors.yellow}3.${colors.reset} ${colors.bright}恢复分组源文件${colors.reset}`);
        console.log(`${colors.green}默认: 1 (开始分组)${colors.reset}\n`);
        
        let choice = await askQuestion(rl, '请输入选择 (1-3): ');
        if (!choice) choice = '1';
        
        rl.close();
        
        if (choice === '1') {
            // 第二步：选择文件类型
            await selectFileType();
            await interactiveConfig();
            organizeFiles();
        } else if (choice === '2') {
            console.log(`\n${colors.magenta}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.magenta}${colors.bright}  🔄 二次匹配单文件${colors.reset}`);
            console.log(`${colors.magenta}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
            // 第二步：选择文件类型
            await selectFileType();
            await interactiveConfig();
            await rematchSingleFiles();
        } else if (choice === '3') {
            console.log(`\n${colors.red}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.red}${colors.bright}  ↩️  恢复文件到原始位置${colors.reset}`);
            console.log(`${colors.red}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
            restoreFiles();
        } else {
            console.log(`${colors.red}✗ 无效的选择，退出程序${colors.reset}`);
        }
    } catch (error) {
        console.error(`${colors.red}发生错误: ${error.message}${colors.reset}`);
    }
}

// 执行
main();
