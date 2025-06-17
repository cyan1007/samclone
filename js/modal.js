const modalWrap = document.querySelector(".modal-wrap");
const modalMenuBtn = document.querySelector(".modal-menu-btn");
const modalCloseBtn = document.querySelector(".modal-close-btn");
const modalDepth2List = document.querySelectorAll(".modal-submenu > li");
// console.log(modalDepth2List);
const modalDepth3List = document.querySelectorAll(".modal-submenu > li > ul");
// console.log(modalDepth3List);
let isDepth3Active = false; // depth3 활성 상태
let activeDepth2 = null; // 현재 활성화 된 depth2 확인

// 모달 메뉴 팝업 기능
modalMenuBtn.addEventListener("click", (e) => {
 e.preventDefault();

 // 모달 팝업 시 html, body 스크롤 막기
 document.documentElement.style.overflowY = "hidden";
 modalWrap.style.right = 0;
});
// 모달 닫기 버튼 기능
modalCloseBtn.addEventListener("click", () => {
 modalWrap.style.right = "-100%";
 document.documentElement.style.overflowY = "auto";
});

// 모달 메뉴 아코디언 기능
modalDepth2List.forEach((depth2, index) => {
 depth2.addEventListener("click", (e) => {
  e.preventDefault();

  const depth3 = depth2.querySelector("ul");
  const depth3Height = depth3.scrollHeight;
  console.log(`${index + 1}번 depth2 메뉴 클릭`, depth3);
  console.log(`depth3 높이: ${depth3Height}`);

  // 현재 활성화 된 depth2가 있고,
  // 그 depth2가 클릭 된 depth2와 다르면 기존 depth2의 depth3는 닫기
  if (activeDepth2 && activeDepth2 !== depth2) {
   const activeDepth3 = activeDepth2.querySelector("ul");
   isDepth3Active = false;
   activeDepth2.classList.remove("open");
   activeDepth3.style.height = 0;
   console.log("열려있던 depth3 닫힘");
  }

  // depth3 활성 상태를 토글
  isDepth3Active = !isDepth3Active;
  if (isDepth3Active) {
   depth2.classList.add("open");
   depth3.style.height = `${depth3Height}px`;
   activeDepth2 = depth2;
  } else {
   depth2.classList.remove("open");
   depth3.style.height = 0;
   activeDepth2 = null;
  }
 });
});

// 이벤트 전파 방지
modalDepth3List.forEach((depth3) => {
 depth3.addEventListener("click", (e) => {
  e.stopPropagation();
 });
});
