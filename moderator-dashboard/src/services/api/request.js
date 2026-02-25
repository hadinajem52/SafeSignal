export async function requestData(requestFn, fallbackMessage) {
  try {
    const response = await requestFn();
    return { success: true, data: response.data.data };
  } catch (error) {
    return {
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        fallbackMessage,
      status: error.response?.status ?? null,
    };
  }
}

export async function requestWithMessage(requestFn, fallbackMessage) {
  try {
    const response = await requestFn();
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        fallbackMessage,
      status: error.response?.status ?? null,
    };
  }
}
