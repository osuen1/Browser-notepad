// --- Конвертация PDF в бинарный формат (Base64) ---

function convertPdfToBinary(file) {
  return new Promise((resolve, reject) => {
    if (!file || file.type !== "application/pdf") {
      reject(new Error("Пожалуйста, выберите PDF файл"));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        // Конвертируем файл в base64 (бинарный формат для передачи)
        // Используем readAsArrayBuffer вместо устаревшего readAsBinaryString
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
    // Конвертируем base64 обратно в бинарную строку
    const binaryString = atob(base64String);
    
    // Конвертируем бинарную строку в массив байтов
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Создаем Blob из массива байтов
    const blob = new Blob([bytes], { type: "application/pdf" });

    // Создаем URL для просмотра или скачивания
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
    // Открываем PDF в новой вкладке
    window.open(pdfUrl, "_blank");
  } else {
    alert("Ошибка при открытии PDF файла");
  }
}

// --- Отправка PDF на сервер в формате JSON ---

async function sendPdfToServer(file) {
  const userId = getUserId();
  if (!userId) {
    console.warn("User_id не найден.");
    return false;
  }

  try {
    // Конвертируем PDF в base64
    const base64String = await convertPdfToBinary(file);

    // Создаем JSON payload
    const payload = {
      user_id: userId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      data: base64String, // Base64 строка PDF файла
      upload_date: new Date().toISOString()
    };

    // Отправляем на сервер
    const response = await fetch("/api/files/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ PDF файл успешно загружен на сервер:", result);
    return true;
  } catch (error) {
    console.error("❌ Ошибка при отправке PDF на сервер:", error);
    return false;
  }
}

// --- Скачивание PDF из base64 ---

function downloadPdfFromBase64(base64String, fileName = "document.pdf") {
  try {
    const pdfUrl = convertBinaryToPdf(base64String, fileName);
    
    if (pdfUrl) {
      // Создаем временный элемент ссылки и кликаем на него
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Очищаем ресурсы
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);

      console.log(`✅ PDF файл "${fileName}" скачан`);
    }
  } catch (error) {
    console.error("❌ Ошибка при скачивании PDF:", error);
  }
}

// --- Обработчик для загрузки файла через input ---

function setupPdfUploadHandler(inputElementId, callback) {
  const inputElement = document.getElementById(inputElementId);
  
  if (!inputElement) {
    console.error(`Элемент с ID "${inputElementId}" не найден`);
    return;
  }

  inputElement.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    
    if (!file) return;

    try {
      const base64String = await convertPdfToBinary(file);
      
      // Отправляем на сервер
      const success = await sendPdfToServer(file);
      
      if (success && callback) {
        callback(base64String, file.name);
      }
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    }
  });
}

// --- Вспомогательные функции ---

function getUserId() {
  return parseInt(localStorage.getItem("user_id"));
}

// Пример использования:
/*
// В HTML добавить:
// <input type="file" id="pdf-upload" accept=".pdf">
// <button id="view-pdf-btn">Просмотреть PDF</button>

// В JavaScript инициализировать:
// setupPdfUploadHandler("pdf-upload", (base64, fileName) => {
//   console.log("PDF загружен:", fileName);
//   // Используйте base64String по необходимости
// });

// Для просмотра:
// viewPdfFromBase64(base64String, fileName);

// Для скачивания:
// downloadPdfFromBase64(base64String, fileName);
*/
