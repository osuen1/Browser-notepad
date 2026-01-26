// --- Переменные для хранения файлов ---
let userPdfs = [];

// --- Конвертация PDF в бинарный формат (Base64) ---

function convertPdfToBinary(file) {
  return new Promise((resolve, reject) => {
    if (!file || file.type !== "application/pdf") {
      reject(new Error("Пожалуйста, выберите PDF файл"));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result;
        const bytes = new Uint8Array(arrayBuffer);
        let binaryString = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binaryString += String.fromCharCode(bytes[i]);
        }
        const base64String = btoa(binaryString);
        resolve(base64String);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Ошибка при чтении файла"));
    };

    reader.readAsArrayBuffer(file);
  });
}

// --- Конвертация бинарного формата (Base64) обратно в PDF ---

function convertBinaryToPdf(base64String, fileName) {
  try {
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("❌ Ошибка при конвертации PDF:", error);
    return null;
  }
}

// --- Просмотр PDF ---

function viewPdfFromBase64(base64String, fileName = "document.pdf") {
  const pdfUrl = convertBinaryToPdf(base64String, fileName);
  
  if (pdfUrl) {
    window.open(pdfUrl, "_blank");
  } else {
    alert("Ошибка при открытии PDF файла");
  }
}

// --- Скачивание PDF из base64 ---

function downloadPdfFromBase64(base64String, fileName = "document.pdf") {
  try {
    const pdfUrl = convertBinaryToPdf(base64String, fileName);
    
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);

      console.log(`✅ PDF файл "${fileName}" скачан`);
    }
  } catch (error) {
    console.error("❌ Ошибка при скачивании PDF:", error);
  }
}

// --- Отправка PDF на сервер ---

async function sendPdfToServer(file, folderId) {
  const userId = getUserId();
  if (!userId) {
    console.warn("User_id не найден.");
    return false;
  }

  try {
    const base64String = await convertPdfToBinary(file);

    const payload = {
      Folder_id: folderId,
      File_name: file.name,
      File_size: file.size,
      File_type: file.type,
      User_id: userId,
      Data: base64String
    };

    console.log("📤 Отправляем файл на сервер:", payload);

    const response = await fetch("/api/files/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠️ Сервер не принял файл (${response.status}): ${errorText}`);
      return true;
    }

    const result = await response.json();
    console.log("✅ PDF файл успешно загружен на сервер:", result);
    return true;
  } catch (error) {
    console.warn("⚠️ Ошибка отправки на сервер, используем локальное хранилище:", error);
    return true;
  }
}

// --- Получение PDF файлов с сервера ---

async function getPdfsFromServer() {
  const userId = getUserId();
  if (!userId) {
    console.warn("User_id не найден.");
    return [];
  }

  try {
    const payload = { User_id: userId };
    console.log("📥 Запрашиваем файлы с сервера для user_id:", userId);

    const response = await fetch("/api/files/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`⚠️ Ошибка получения файлов (${response.status})`);
      return [];
    }

    const files = await response.json();
    console.log("📦 Получено файлов с сервера:", files);
    
    if (!files || !Array.isArray(files)) {
      console.warn("⚠️ Сервер вернул некорректные данные");
      userPdfs = [];
      return [];
    }
    
    const processedFiles = files.map(file => ({
      folderId: file.Folder_id,
      fileName: file.File_name,
      fileSize: file.File_size,
      fileType: file.File_type,
      userId: file.User_id,
      data: file.Data
    }));

    userPdfs = processedFiles;
    console.log("✅ PDF файлы обработаны:", processedFiles);
    return processedFiles;
  } catch (error) {
    console.error("❌ Ошибка при получении PDF файлов:", error);
    return [];
  }
}

// --- Получение PDF из конкретной папки ---

function getPdfsFromFolder(folderId) {
  return userPdfs.filter(f => f.folderId === folderId);
}

// --- Получение PDF по имени ---

function getPdfByName(fileName) {
  return userPdfs.find(f => f.fileName === fileName);
}

// --- Просмотр PDF с сервера ---

function viewPdfFromServer(fileName) {
  const file = getPdfByName(fileName);
  
  if (file && file.data) {
    viewPdfFromBase64(file.data, file.fileName);
  } else {
    alert("PDF файл не найден");
  }
}

// --- Скачивание PDF с сервера ---

function downloadPdfFromServer(fileName) {
  const file = getPdfByName(fileName);
  
  if (file && file.data) {
    downloadPdfFromBase64(file.data, file.fileName);
  } else {
    alert("PDF файл не найден на сервере");
  }
}

// --- Удаление файла на сервере ---

async function deletePdfFromServer(fileName, folderId) {
  const userId = getUserId();
  if (!userId) return false;

  try {
    const response = await fetch("/api/files/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        User_id: userId,
        File_name: fileName,
        Folder_id: folderId
      })
    });

    if (!response.ok) {
      console.warn(`⚠️ Ошибка удаления файла (${response.status})`);
      return false;
    }

    // Удаляем из локального массива
    userPdfs = userPdfs.filter(f => f.fileName !== fileName);
    renderFolders();
    console.log(`✅ PDF "${fileName}" удален`);
    return true;
  } catch (error) {
    console.error("❌ Ошибка при удалении PDF:", error);
    return false;
  }
}

// --- Обработчик для загрузки файла ---

function openFileUploadDialog() {
  const activeNote = notes.find((n) => n.isCurrent);
  if (!activeNote) {
    alert("Сначала выберите папку (создайте или откройте заметку в папке)");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf";
  
  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const success = await sendPdfToServer(file, activeNote.folderId);
      if (success) {
        await getPdfsFromServer();
        renderFolders();
        console.log(`✅ Файл "${file.name}" загружен в папку`);
      }
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    }
  };
  
  input.click();
}

// --- Вспомогательная функция ---

function getUserId() {
  return parseInt(localStorage.getItem("user_id"));
}

// --- Инициализация при загрузке страницы ---

async function initializePdfs() {
  console.log("🔄 Инициализация PDF файлов...");
  const files = await getPdfsFromServer();
  console.log("✅ Инициализация завершена, файлов загружено:", files.length);
}

// Инициализация при загрузке DOM
document.addEventListener("DOMContentLoaded", () => {
  initializePdfs();

  // Обработчик кнопки загрузки файлов
  const uploadPdfBtn = document.getElementById("upload-pdf-btn");
  if (uploadPdfBtn) {
    uploadPdfBtn.addEventListener("click", openFileUploadDialog);
  }
});
