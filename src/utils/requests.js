export default class Requests {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }

    getHeaders() {
        const token = localStorage.getItem("token");

        return {
            "Content-Type": "application/json",
            ...(token && {
                "Authorization": `Bearer ${token}`
            })
        };
    }

    /**
     * Executa o fetch sem consumir a resposta. Manter este passo separado
     * permite que clientes autenticados tratem um 401 antes de fazer o parse.
     */
    async send(url, options = {}) {
        const {
            headers = {},
            credentials = "include",
            skipAuthRefresh: _skipAuthRefresh,
            ...fetchOptions
        } = options;

        return fetch(url, {
            ...fetchOptions,
            credentials,
            headers: {
                ...this.getHeaders(),
                ...headers,
            },
        });
    }

    async request(url, options = {}) {
        const response = await this.send(url, options);
        return this.handleResponse(response);
    }

    async handleResponse(response) {
        const contentType =
            response.headers.get("content-type") || "";

        const data =
            contentType.includes("application/json")
                ? await response.json()
                : null;

        if (!response.ok) {
            const error = new Error(
                data?.detail ||
                data?.message ||
                `Erro HTTP ${response.status}`
            );
            error.status = response.status;
            throw error;
        }

        return data;
    }

    //GET
    async getData(endpoint, params, options = {}) {

        try {

            const url =
                new URL(
                    `${this.apiUrl}${endpoint}`
                );

            if (params) {

                Object.keys(params)
                    .forEach(key => {
                        // Ignora valores nulos/undefined para nao enviar "null" na querystring
                        if (params[key] != null) {
                            url.searchParams.append(
                                key,
                                params[key]
                            );
                        }
                    });

            }

            return this.request(url, options);

        } catch (error) {

            console.error(error);

            throw error;
        }
    }

    //POST
    async postData(endpoint, data, options = {}) {

        return this.request(`${this.apiUrl}${endpoint}`, {
            ...options,
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    //PUT
    async putData(endpoint, data, options = {}) {

        return this.request(`${this.apiUrl}${endpoint}`, {
            ...options,
            method: "PUT",
            body: JSON.stringify(data),
        });
    }

    //PATCH
    async patchData(endpoint, data, options = {}) {

        return this.request(`${this.apiUrl}${endpoint}`, {
            ...options,
            method: "PATCH",
            body: JSON.stringify(data),
        });
    }

    //DELETE
    async deleteData(endpoint, options = {}) {

        return this.request(`${this.apiUrl}${endpoint}`, {
            ...options,
            method: "DELETE",
        });
    }
}
