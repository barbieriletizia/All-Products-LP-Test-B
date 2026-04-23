(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  function followCursorOnHover() {
    var containers = document.querySelectorAll("[data-container-hover-follow]");
    if (!containers.length) return;

    var ease = 0.12;

    containers.forEach(function (container) {
      var follower = container.querySelector("[data-hover-follow]");
      if (!follower) return;

      var currentX = 0;
      var currentY = 0;
      var targetX = 0;
      var targetY = 0;
      var isHovering = false;
      var animationId = null;

      function getFollowerSize() {
        var r = follower.getBoundingClientRect();
        return { width: r.width, height: r.height };
      }

      function updatePosition() {
        var size = getFollowerSize();
        var followerWidth = size.width;
        var followerHeight = size.height;
        if (
          !isHovering &&
          Math.abs(targetX - currentX) < 0.5 &&
          Math.abs(targetY - currentY) < 0.5
        ) {
          cancelAnimationFrame(animationId);
          animationId = null;
          return;
        }
        currentX += (targetX - currentX) * ease;
        currentY += (targetY - currentY) * ease;
        follower.style.transform =
          "translate(" +
          (currentX - followerWidth / 2) +
          "px, " +
          (currentY - followerHeight / 2) +
          "px)";
        animationId = requestAnimationFrame(updatePosition);
      }

      container.addEventListener("mouseenter", function (e) {
        isHovering = true;
        var rect = container.getBoundingClientRect();
        targetX = e.clientX - rect.left;
        targetY = e.clientY - rect.top;
        currentX = targetX;
        currentY = targetY;
        var sz = getFollowerSize();
        follower.style.transform =
          "translate(" +
          (currentX - sz.width / 2) +
          "px, " +
          (currentY - sz.height / 2) +
          "px)";
        follower.style.transition = "opacity 0.3s ease-out";
        follower.style.opacity = "1";
        if (!animationId) {
          animationId = requestAnimationFrame(updatePosition);
        }
      });

      container.addEventListener("mousemove", function (e) {
        var rect = container.getBoundingClientRect();
        targetX = e.clientX - rect.left;
        targetY = e.clientY - rect.top;
        if (!animationId) {
          animationId = requestAnimationFrame(updatePosition);
        }
      });

      container.addEventListener("mouseleave", function () {
        isHovering = false;
        follower.style.transition = "opacity 0.4s ease-out";
        follower.style.opacity = "0";
      });
    });
  }

  followCursorOnHover();
})();
