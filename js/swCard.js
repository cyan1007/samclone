const swCard = new Swiper(".sw-card", {
 // 기본값
 centeredSlides: false,
 slidesPerView: "auto",
 spaceBetween: 30,
 pagination: {
  el: ".swiper-pagination",
  clickable: true,
 },
 navigation: {
  nextEl: ".swiper-button-next",
  prevEl: ".swiper-button-prev",
 },
 //  반응형
 breakpoints: {
  // window.width >= 0
  0: {
   centeredSlides: true,
   spaceBetween: 20,
  },
  // window.width >= 768
  768: {
   centeredSlides: false,
   spaceBetween: 30,
  },
  // window.width >= 1220
  1220: {
   centeredSlides: false,
   spaceBetween: 30,
  },
 },
});
