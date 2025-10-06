// 파일 다운로드를 위한 Node.js 내장 모듈 불러오기
const https = require('https');
const fs = require('fs');
const path = require('path');

// 다운로드할 파일 목록
const filesToDownload = [
    { url: 'https://www.astro.com/ftp/swisseph/ephe/sepl_18.se1', name: 'sepl_18.se1' },
    { url: 'https://www.astro.com/ftp/swisseph/ephe/semo_18.se1', name: 'semo_18.se1' },
    { url: 'https://www.astro.com/ftp/swisseph/ephe/seas_18.se1', name: 'seas_18.se1' }
];

// 파일이 저장될 폴더 경로
const downloadDir = path.join(__dirname, 'public', 'ephe');

// 폴더가 없으면 생성하기
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
    console.log(`성공: '${downloadDir}' 폴더를 생성했습니다.`);
}

// 파일 다운로드 함수
function downloadFile(fileInfo) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(downloadDir, fileInfo.name);
        const fileStream = fs.createWriteStream(filePath);

        console.log(`▶️ ${fileInfo.name} 파일 다운로드를 시작합니다... (주소: ${fileInfo.url})`);

        https.get(fileInfo.url, (response) => {
            // 응답을 파일에 직접 쓴다
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`✅ 성공: ${fileInfo.name} 파일 다운로드 완료!`);
                resolve();
            });

        }).on('error', (err) => {
            fs.unlink(filePath, () => {}); // 실패 시 파일 삭제
            console.error(`❌ 실패: ${fileInfo.name} 파일 다운로드 중 오류 발생:`, err.message);
            reject(err);
        });
    });
}

// 모든 파일을 순차적으로 다운로드 실행
async function startDownloads() {
    console.log('--- 천체력 파일 다운로드 프로그램을 시작합니다 ---');
    for (const file of filesToDownload) {
        try {
            await downloadFile(file);
        } catch (error) {
            console.error(`치명적 오류로 인해 프로그램이 중단됩니다. 네트워크 연결을 확인해주세요.`);
            return; // 오류 발생 시 중단
        }
    }
    console.log('\n🎉 모든 파일 다운로드를 성공적으로 완료했습니다! 🎉');
}

// 프로그램 실행!
startDownloads();