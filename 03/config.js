// 03/config.js

export const SUBJECT_NAME = "고전산문";

export const GITHUB_CONFIG = { 
    username: "kimjs2623", 
    repo: "for-study", 
    branch: "main", 
    folder: "03/pdf", 
    answerKeyFileName: "정답해설.pdf" 
};

// 고전산문 49일 치 정확한 배분
export const DAY_MAP = [
    "01-02", "03-04", "05-06", "07-08", "09-11", "12-13", "14-15", "16-17", "18-19", "20-21", 
    "22-23", "24-25", "26-27", "28-30", "31-34", "35-36", "37-40", "41-42", "43-44", "45-46", 
    "47-48", "49-50", "51-52", "53-54", "55-56", "57-58", "59-60", "61-62", "63-64", "65-66", 
    "67-70", "71-74", "75-76", "77-78", "79-80", "81-82", "83-84", "85-86", "87-88", "89-94", 
    "95-96", "97-99", "100-101", "102-103", "104-108", "109-111", "112-114", "115-118", "119-121"
];

export const WORK_INDEX = {
    "001. 단군신화": { file: "01. 상고 시대_1-15.pdf", bookPage: 24, author: "작자 미상" },
    "002. 주몽 신화": { file: "01. 상고 시대_1-15.pdf", bookPage: 26, author: "작자 미상" },
    "003. 가락국기": { file: "01. 상고 시대_1-15.pdf", bookPage: 28, author: "작자 미상" },
    "004. 온달 설화": { file: "01. 상고 시대_1-15.pdf", bookPage: 30, author: "작자 미상" },
    "005. 조신지몽": { file: "01. 상고 시대_1-15.pdf", bookPage: 32, author: "작자 미상" },
    "006. 도미 설화": { file: "01. 상고 시대_1-15.pdf", bookPage: 34, author: "작자 미상" },
    "007. 지귀 설화": { file: "01. 상고 시대_1-15.pdf", bookPage: 36, author: "작자 미상" },
    "008. 화왕계": { file: "01. 상고 시대_1-15.pdf", bookPage: 38, author: "설총" },
    "009. 김현감호": { file: "01. 상고 시대_1-15.pdf", bookPage: 40, author: "작자 미상" },
    "010. 경문 대왕 이야기": { file: "01. 상고 시대_1-15.pdf", bookPage: 42, author: "작자 미상" },
    "011. 지하국 대적 퇴치 설화": { file: "01. 상고 시대_1-15.pdf", bookPage: 44, author: "작자 미상" },
    "012. 석탈해 신화": { file: "01. 상고 시대_1-15.pdf", bookPage: 46, author: "작자 미상" },
    "013. 가실과 설씨녀 설화": { file: "01. 상고 시대_1-15.pdf", bookPage: 47, author: "작자 미상" },
    "014. 왕오천축국전": { file: "01. 상고 시대_1-15.pdf", bookPage: 48, author: "혜초" },
    "015. 격황소서": { file: "01. 상고 시대_1-15.pdf", bookPage: 50, author: "최치원" },
    "016. 공방전": { file: "02. 고려 시대_16-25.pdf", bookPage: 56, author: "임춘" },
    "017. 국순전": { file: "02. 고려 시대_16-25.pdf", bookPage: 60, author: "임춘" },
    "018. 국선생전": { file: "02. 고려 시대_16-25.pdf", bookPage: 64, author: "이규보" },
    "019. 청강사자현부전": { file: "02. 고려 시대_16-25.pdf", bookPage: 68, author: "이규보" },
    "020. 경설": { file: "02. 고려 시대_16-25.pdf", bookPage: 72, author: "이규보" },
    "021. 이옥설": { file: "02. 고려 시대_16-25.pdf", bookPage: 74, author: "이규보" },
    "022. 이상자대": { file: "02. 고려 시대_16-25.pdf", bookPage: 76, author: "이규보" },
    "023. 차마설": { file: "02. 고려 시대_16-25.pdf", bookPage: 78, author: "이곡" },
    "024. 슬견설": { file: "02. 고려 시대_16-25.pdf", bookPage: 80, author: "이규보" },
    "025. 괴토실설": { file: "02. 고려 시대_16-25.pdf", bookPage: 81, author: "이규보" },
    "026. 만복사저포기": { file: "03. 조선 전기_26-40.pdf", bookPage: 86, author: "김시습" },
    "027. 이생규장전": { file: "03. 조선 전기_26-40.pdf", bookPage: 90, author: "김시습" },
    "028. 용궁부연록": { file: "03. 조선 전기_26-40.pdf", bookPage: 94, author: "김시습" },
    "029. 남염부주지": { file: "03. 조선 전기_26-40.pdf", bookPage: 98, author: "김시습" },
    "030. 취유부벽정기": { file: "03. 조선 전기_26-40.pdf", bookPage: 99, author: "김시습" },
    "031. 설공찬전": { file: "03. 조선 전기_26-40.pdf", bookPage: 100, author: "채수" },
    "032. 화사": { file: "03. 조선 전기_26-40.pdf", bookPage: 101, author: "임제" },
    "033. 주옹설": { file: "03. 조선 전기_26-40.pdf", bookPage: 102, author: "권근" },
    "034. 주봉설": { file: "03. 조선 전기_26-40.pdf", bookPage: 104, author: "강유선" },
    "035. 난중일기": { file: "03. 조선 전기_26-40.pdf", bookPage: 106, author: "이순신" },
    "036. 보지 못한 폭포": { file: "03. 조선 전기_26-40.pdf", bookPage: 108, author: "김창협" },
    "037. 차계기환": { file: "03. 조선 전기_26-40.pdf", bookPage: 110, author: "서거정" },
    "038. 용재총화": { file: "03. 조선 전기_26-40.pdf", bookPage: 110, author: "성현" },
    "039. 도산십이곡 발": { file: "03. 조선 전기_26-40.pdf", bookPage: 111, author: "이황" },
    "040. 퇴계의 편지": { file: "03. 조선 전기_26-40.pdf", bookPage: 111, author: "이황" },
    "041. 최고운전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 118, author: "작자 미상" },
    "042. 홍길동전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 122, author: "허균" },
    "043. 최척전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 126, author: "조위한" },
    "044. 박씨전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 130, author: "작자 미상" },
    "045. 구운몽": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 134, author: "김만중" },
    "046. 사씨남정기": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 138, author: "김만중" },
    "047. 운영전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 142, author: "작자 미상" },
    "048. 숙향전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 146, author: "작자 미상" },
    "049. 홍계월전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 150, author: "작자 미상" },
    "050. 소대성전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 154, author: "작자 미상" },
    "051. 유충렬전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 158, author: "작자 미상" },
    "052. 임진록": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 162, author: "작자 미상" },
    "053. 임경업전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 166, author: "작자 미상" },
    "054. 조웅전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 170, author: "작자 미상" },
    "055. 춘향전": { file: "04. 조선 후기_고전 소설_41-73.pdf", bookPage: 174, author: "작자 미상" },
    "074. 규중칠우쟁론기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 232, author: "작자 미상" },
    "075. 원이 엄마의 한글 편지": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 236, author: "이응태 부인" },
    "076. 산성일기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 238, author: "어느 궁녀" },
    "077. 서포만필": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 240, author: "김만중" },
    "078. 요로원야화기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 242, author: "박두세" },
    "079. 낙치설": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 244, author: "김창흡" },
    "080. 의산문답": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 246, author: "홍대용" },
    "081. 동명일기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 248, author: "의유당" },
    "082. 이름 없는 꽃": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 252, author: "신경준" },
    "083. 옛사람의 독서 일기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 254, author: "유만주" },
    "084. 통곡할 만한 자리": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 256, author: "박지원" },
    "085. 일야구도하기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 260, author: "박지원" },
    "086. 상기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 264, author: "박지원" },
    "087. 수오재기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 266, author: "정약용" },
    "088. 포화옥기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 268, author: "이학규" },
    "089. 한중록": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 270, author: "혜경궁 홍씨" },
    "090. 조침문": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 274, author: "유씨 부인" },
    "091. 통곡헌기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 278, author: "허균" },
    "092. 내간": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 279, author: "선조 외" },
    "093. 요술에 대하여": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 280, author: "박지원" },
    "094. 임술기": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 281, author: "황상" },
    "095. 흥보가": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 282, author: "작자 미상" },
    "096. 적벽가": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 286, author: "작자 미상" },
    "097. 춘향가": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 290, author: "작자 미상" },
    "098. 심청가": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 294, author: "작자 미상" },
    "099. 수궁가": { file: "05. 조선 후기_수필,극,설화_74-121.pdf", bookPage: 295, author: "작자 미상" }
};

export const FILE_START_PAGE = {
    "00. 고전산문_핵심노트.pdf": 20, 
    "01. 상고 시대_1-15.pdf": 22,
    "02. 고려 시대_16-25.pdf": 54,
    "03. 조선 전기_26-40.pdf": 84,
    "04. 조선 후기_고전 소설_41-73.pdf": 114,
    "05. 조선 후기_수필,극,설화_74-121.pdf": 232
};

export const FILE_OFFSET_MAP = {
    "00. 고전산문_핵심노트.pdf": { pdfPage: 1, bookPage: 20 },
    "01. 상고 시대_1-15.pdf": { pdfPage: 1, bookPage: 22 },
    "02. 고려 시대_16-25.pdf": { pdfPage: 1, bookPage: 54 },
    "03. 조선 전기_26-40.pdf": { pdfPage: 1, bookPage: 84 },
    "04. 조선 후기_고전 소설_41-73.pdf": { pdfPage: 1, bookPage: 114 },
    "05. 조선 후기_수필,극,설화_74-121.pdf": { pdfPage: 1, bookPage: 232 }
};