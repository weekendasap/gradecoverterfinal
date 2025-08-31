document.addEventListener('DOMContentLoaded', () => {
  // 공통 요소
  const totalStudentsInput = document.getElementById('g1_total_students');
  const calculateBtn = document.getElementById('calculateBtn');
  const resetBtn = document.getElementById('resetBtn');

  const validationSummary = document.getElementById('validationSummary');

  const s1ResultsDiv = document.getElementById('s1_results');
  const s2ResultsDiv = document.getElementById('s2_results');
  const overallResultsDiv = document.getElementById('overall_results');

  const pyramidContainer = document.getElementById('pyramid_container');
  const percentileText = document.getElementById('percentile_text');

  // 과목 구성
  const SUBJECTS = [
    { key: 'korean', label: '국어' },
    { key: 'english', label: '영어' },
    { key: 'math', label: '수학' },
    { key: 'social', label: '사회' },
    { key: 'science', label: '과학' }
  ];
  const TERMS = ['s1', 's2']; // 1학기, 2학기

  // 9등급제 임계값(상위 % 기준)
  const GRADE_BANDS = [
    { grade: 1, upper: 4 },
    { grade: 2, upper: 11 },
    { grade: 3, upper: 23 },
    { grade: 4, upper: 40 },
    { grade: 5, upper: 60 },
    { grade: 6, upper: 77 },
    { grade: 7, upper: 89 },
    { grade: 8, upper: 96 },
    { grade: 9, upper: 100 }
  ];

  // 규칙: 5등급제(1~5등급, 점수 기준)
  function fiveLevel(score) {
    if (score == null || isNaN(score)) return null;
    if (score >= 90) return 1;
    if (score >= 80) return 2;
    if (score >= 70) return 3;
    if (score >= 60) return 4;
    return 5;
  }

  // 규칙: 9등급제(백분위 → 9등급)
  function nineLevelFromPercentile(percentile) {
    if (percentile == null || isNaN(percentile)) return null;
    if (percentile <= 4) return 1;
    if (percentile <= 11) return 2;
    if (percentile <= 23) return 3;
    if (percentile <= 40) return 4;
    if (percentile <= 60) return 5;
    if (percentile <= 77) return 6;
    if (percentile <= 89) return 7;
    if (percentile <= 96) return 8;
    return 9;
  }

  // 유틸: 값 읽기/오류 표시
  function v(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    const raw = el.value;
    return raw === '' ? '' : raw;
  }
  function vNum(id) {
    const raw = v(id);
    if (raw === '') return null;
    const x = parseFloat(raw);
    return isNaN(x) ? null : x;
  }
  function setFieldError(inputId, msg) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;
    const group = inputEl.closest('.input-group');
    const errorElId = inputId + 'Error';
    let errorEl = document.getElementById(errorElId);
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.id = errorElId;
      group.appendChild(errorEl);
    }
    if (msg) {
      group && group.classList.add('invalid');
      errorEl.textContent = msg;
    } else {
      group && group.classList.remove('invalid');
      errorEl.textContent = '';
    }
  }
  function clearAllErrors() {
    document.querySelectorAll('.input-group.invalid').forEach(g => g.classList.remove('invalid'));
    document.querySelectorAll('.error-message').forEach(e => (e.textContent = ''));
    validationSummary.textContent = '';
    validationSummary.classList.remove('show');
  }

  // 입력 검증
  function validateInputs() {
    clearAllErrors();
    let hasError = false;

    const totalStudents = vNum('g1_total_students');
    if (totalStudents == null || totalStudents <= 0) {
      setFieldError('g1_total_students', '1 이상의 숫자를 입력하세요.');
      hasError = true;
    }

    // 각 학기/과목 점수와 등수 검증
    TERMS.forEach(term => {
      SUBJECTS.forEach(sub => {
        const scoreId = `${term}_${sub.key}_score`;
        const rankId = `${term}_${sub.key}_rank`;

        // 점수
        const score = v(scoreId);
        if (score !== '') {
          const scoreNum = vNum(scoreId);
          if (scoreNum == null || scoreNum < 0 || scoreNum > 100) {
            setFieldError(scoreId, '0~100 사이의 점수를 입력하세요.');
            hasError = true;
          } else {
            setFieldError(scoreId, '');
          }
        } else {
          setFieldError(scoreId, '');
        }

        // 등수
        const rank = v(rankId);
        if (rank !== '') {
          if (totalStudents == null || totalStudents <= 0) {
            setFieldError(rankId, '');
          } else {
            const r = vNum(rankId);
            if (r == null || r < 1 || r > totalStudents) {
              setFieldError(rankId, `1 이상, 전체 학생 수(${totalStudents}) 이하로 입력하세요.`);
              hasError = true;
            } else {
              setFieldError(rankId, '');
            }
          }
        } else {
          setFieldError(rankId, '');
        }
      });
    });

    if (hasError) {
      validationSummary.textContent = '입력값을 확인하세요.';
      validationSummary.classList.add('show');
    }
    return !hasError;
  }

  // 피라미드 SVG 렌더(명확한 등급 경계/눈금/라벨 포함)
  function renderPyramid(percentile) {
    const has = percentile != null && !isNaN(percentile);
    const p = has ? Math.max(0, Math.min(100, percentile)) : null;

    // SVG 기하 정보
    const W = 320, H = 260;
    const topY = 20, bottomY = H - 20;
    const leftX = 30, rightX = W - 30;
    const usableH = bottomY - topY;
    const centerX = W / 2;

    const yFromPct = (pct) => topY + (pct / 100) * usableH;

    // 10% 눈금
    const ticks = Array.from({ length: 11 }, (_, i) => i * 10); // 0,10,...,100

    // 9등급 대역(상한값 기준 → 하한은 이전 상한)
    let prevUpper = 0;
    const bands = GRADE_BANDS.map(b => {
      const band = { grade: b.grade, from: prevUpper, to: b.upper };
      prevUpper = b.upper;
      return band;
    });

    // clipPath로 삼각형 내부에 대역 색 채우기
    const bandsRects = bands.map((b, idx) => {
      const y1 = yFromPct(b.from);
      const y2 = yFromPct(b.to);
      const h = Math.max(0, y2 - y1);
      const fill = idx % 2 === 0 ? '#f4f8ff' : '#eef4ff';
      return `<rect x="${leftX}" y="${y1.toFixed(2)}" width="${(rightX-leftX)}" height="${h.toFixed(2)}" fill="${fill}" opacity="0.85"/>`;
    }).join('');

    // 등급 경계 라인 + 라벨
    const bandLines = bands.map(b => {
      const y = yFromPct(b.to);
      const lbl = `${b.grade}등급 ${b.to}%`;
      return `
        <line x1="${leftX}" x2="${rightX}" y1="${y}" y2="${y}" stroke="#d8e4ff" stroke-width="1" />
        <text x="${leftX - 6}" y="${y - 2}" text-anchor="end" font-size="10" fill="#5b6b8b">${lbl}</text>
      `;
    }).join('');

    // 10% 눈금 라인 + 퍼센트 라벨(우측)
    const tickLines = ticks.map(t => {
      const y = yFromPct(t);
      return `
        <line x1="${leftX}" x2="${rightX}" y1="${y}" y2="${y}" stroke="#eef2ff" stroke-width="0.8" />
        <text x="${rightX + 6}" y="${y + 3}" font-size="10" fill="#90a0bf">${t}%</text>
      `;
    }).join('');

    // 현재 위치 라인/마커/라벨
    const marker = has ? (() => {
      const y = yFromPct(p);
      const g = nineLevelFromPercentile(p);
      const label = `상위 ${p.toFixed(2)}% · 9등급제 ${g}등급`;
      const boxW = 150, boxH = 26, boxX = centerX - boxW/2, boxY = y - boxH - 8;
      return `
        <line x1="${leftX}" x2="${rightX}" y1="${y}" y2="${y}" stroke="#ff6b6b" stroke-width="1.6" stroke-dasharray="3,3"/>
        <circle cx="${centerX}" cy="${y}" r="3" fill="#ff6b6b"/>
        <g>
          <rect x="${boxX}" y="${Math.max(topY, boxY)}" rx="12" ry="12" width="${boxW}" height="${boxH}" fill="#111827" opacity="0.9"/>
          <text x="${centerX}" y="${Math.max(topY, boxY)+17}" font-size="12" fill="#ffffff" text-anchor="middle" font-weight="700">${label}</text>
        </g>
      `;
    })() : '';

    const svg = `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="피라미드 그래프">
        <defs>
          <clipPath id="pyrClip">
            <polygon points="${centerX},${topY} ${leftX},${bottomY} ${rightX},${bottomY}" />
          </clipPath>
          <linearGradient id="pyrEdge" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#cfe0ff"/>
            <stop offset="100%" stop-color="#eaf1ff"/>
          </linearGradient>
        </defs>

        <!-- 밑그림: 대역(클립된 사각형들로 채움) -->
        <g clip-path="url(#pyrClip)">
          ${bandsRects}
        </g>

        <!-- 피라미드 외곽선 -->
        <polygon points="${centerX},${topY} ${leftX},${bottomY} ${rightX},${bottomY}" fill="none" stroke="url(#pyrEdge)" stroke-width="2"/>

        <!-- 눈금/등급 경계/라벨 -->
        ${tickLines}
        ${bandLines}

        <!-- 현재 위치 -->
        ${marker}
      </svg>
    `;
    pyramidContainer.innerHTML = svg;
    percentileText.textContent = has ? `전교 상위 ${p.toFixed(2)}%` : '전교 상위 퍼센트 표시를 위해 등수를 입력하세요.';
  }

  // 결과 계산/렌더 (버튼 클릭 시에만 실행)
  function calculate() {
    if (!validateInputs()) {
      s1ResultsDiv.innerHTML = '';
      s2ResultsDiv.innerHTML = '';
      overallResultsDiv.innerHTML = '';
      renderPyramid(null);
      return;
    }

    const totalStudents = vNum('g1_total_students');

    // 누적 통계(종합용)
    let scoreSum = 0, scoreCount = 0;
    let percSum = 0, percCount = 0;

    // 학기별 결과 생성
    TERMS.forEach(term => {
      const container = term === 's1' ? s1ResultsDiv : s2ResultsDiv;
      container.innerHTML = '';

      SUBJECTS.forEach(sub => {
        const score = vNum(`${term}_${sub.key}_score`);
        const rank = vNum(`${term}_${sub.key}_rank`);

        let parts = [];
        if (score != null) {
          const five = fiveLevel(score); // 1~5 숫자
          parts.push(`점수: ${score}점 (<span class="pill pill-purple">5등급제 ${five}등급</span>)`);
          scoreSum += score; scoreCount++;
        } else {
          parts.push(`점수: -`);
        }

        if (rank != null && totalStudents != null && totalStudents > 0) {
          const percentile = (rank / totalStudents) * 100;
          const nine = nineLevelFromPercentile(percentile);
          parts.push(`등수: ${rank}등 / ${totalStudents}명 → 상위 <span class="pill pill-blue">${percentile.toFixed(2)}%</span> (<span class="pill pill-red">9등급제 ${nine}등급</span>)`);
          percSum += percentile; percCount++;
        } else {
          parts.push(`등수: -`);
        }

        const itemHTML = `
          <div class="grade-result-item">
            <div class="item-head"><strong>${sub.label}</strong></div>
            <div class="item-body">
              ${parts.join('<br/>')}
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
      });
    });

    // 종합 결과
    const avgScore = scoreCount > 0 ? (scoreSum / scoreCount) : null;
    const avgScoreFive = avgScore != null ? fiveLevel(avgScore) : null; // 1~5 숫자
    const avgPerc = percCount > 0 ? (percSum / percCount) : null;
    const avgNine = avgPerc != null ? nineLevelFromPercentile(avgPerc) : null;

    overallResultsDiv.innerHTML = `
      <div class="overall-item">
        <div class="overall-title">평균 점수</div>
        <div class="overall-value">${avgScore != null ? avgScore.toFixed(2) + '점' : '-'}</div>
      </div>
      <div class="overall-item">
        <div class="overall-title">종합 5등급제</div>
        <div class="overall-value">${avgScoreFive != null ? `<span class="pill pill-purple big">5등급제 ${avgScoreFive}등급</span>` : '-'}</div>
      </div>
      <div class="overall-item">
        <div class="overall-title">평균 상위 퍼센트</div>
        <div class="overall-value">${avgPerc != null ? `<span class="pill pill-blue big">${avgPerc.toFixed(2)}%</span>` : '-'}</div>
      </div>
      <div class="overall-item">
        <div class="overall-title">종합 9등급제</div>
        <div class="overall-value">${avgNine != null ? `<span class="pill pill-red big">9등급제 ${avgNine}등급</span>` : '-'}</div>
      </div>
    `;

    renderPyramid(avgPerc);
    document.querySelector('.right-pane')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 이벤트 바인딩: 오직 왼쪽 하단 "결과 확인" 클릭 시만 계산
  calculateBtn.addEventListener('click', calculate);

  // 초기화
  resetBtn.addEventListener('click', () => {
    totalStudentsInput.value = '';
    TERMS.forEach(term => {
      SUBJECTS.forEach(sub => {
        const sid = `${term}_${sub.key}_score`;
        const rid = `${term}_${sub.key}_rank`;
        const sEl = document.getElementById(sid);
        const rEl = document.getElementById(rid);
        if (sEl) sEl.value = '';
        if (rEl) rEl.value = '';
      });
    });
    s1ResultsDiv.innerHTML = '';
    s2ResultsDiv.innerHTML = '';
    overallResultsDiv.innerHTML = '';
    clearAllErrors();
    renderPyramid(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 초기 상태: 안내 텍스트 + 빈 그래프
  renderPyramid(null);
});