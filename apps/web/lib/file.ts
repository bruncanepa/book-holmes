export const loadFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = function (event) {
      const imageData = event.target?.result as string;
      resolve(imageData || "");
    };

    reader.onerror = function (event) {
      resolve("");
    };

    reader.readAsDataURL(file);
  });
};
