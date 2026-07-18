// shared/js/state.js

export const state = { 
    // 1. 각 과목(config.js)에서 주입받을 설정 데이터
    appId: 'my-study-app',
    subjectName: '',
    githubConfig: {},
    workIndex: {},
    fileStartPage: {},
    fileOffsetMap: {},
    dayMap: [],

    // 2. 앱 실행 중 변하는 동적 상태 데이터
    user: null, 
    allFiles: [], 
    filteredFiles: [], 
    problemPdfBlob: null,
    answerKeyPdfDoc: null, 
    answerPageNum: 1, 
    answerPdfScale: 1.5,
    isFetching: false, 
    mode: 'omr', 
    weeks: [], 
    allSubmissions: [], 
    editingDocId: null, 
    pdfDoc: null, 
    pageNum: 1, 
    pdfScale: 1.2, 
    userZoomed: false, 
    docWeeks: [],
    scheduleWeeks: [], 
    qaQuestions: [], 
    qaAnswers: [], 
    qaCurrentWork: "",
    mockExams: [], 
    mockAnswers: [], 
    sidebarOpen: true,
    renderTask: null
};