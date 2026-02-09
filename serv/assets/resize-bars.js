document.addEventListener("DOMContentLoaded", () => {
    const leftSidebar = document.querySelector(".sidebar-left");
    const rightSidebar = document.querySelector(".sidebar-right");
    const leftResizer = document.getElementById("left-resizer");
    const rightResizer = document.getElementById("right-resizer");

    let isResizing = false;
    let currentResizer = null;

    const startResize = (resizer) => (e) => {
        isResizing = true;
        currentResizer = resizer;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    };

    const stopResize = () => {
        isResizing = false;
        currentResizer = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    };

    const resize = (e) => {
        if (!isResizing) return;

        if (currentResizer === leftResizer) {
            const newWidth = e.clientX;
            if (newWidth >= 200 && newWidth <= 500) {
                leftSidebar.style.width = `${newWidth}px`;
            }
        }

        if (currentResizer === rightResizer) {
            const windowWidth = window.innerWidth;
            const newWidth = windowWidth - e.clientX;
            if (newWidth >= 200 && newWidth <= 500) {
                rightSidebar.style.width = `${newWidth}px`;
            }
        }
    };

    leftResizer.addEventListener("mousedown", startResize(leftResizer));
    rightResizer.addEventListener("mousedown", startResize(rightResizer));

    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
});
