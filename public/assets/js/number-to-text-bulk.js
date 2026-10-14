document.addEventListener('DOMContentLoaded', () => {

    // =====================================
    // ELEMENT
    // =====================================

    const fileInput =
        document.getElementById('bulkFile');

    const columnArea =
        document.getElementById('bulkColumnArea');

    const columnSelect =
        document.getElementById('bulkColumn');

    const options =
        document.getElementById('bulkOptions');

    const processBtn =
        document.getElementById('bulkProcessBtn');

    const previewArea =
        document.getElementById('bulkPreviewArea');

    const tableHead =
        document.getElementById('bulkTableHead');

    const tableBody =
        document.getElementById('bulkTableBody');

    const count =
        document.getElementById('bulkCount');

    const downloadBtn =
        document.getElementById('bulkDownloadBtn');

    const downloadExcelBtn =
        document.getElementById(
            'bulkDownloadExcelBtn'
        );

    const rupiah =
        document.getElementById('bulkRupiah');

    const capital =
        document.getElementById('bulkCapital');


    // =====================================
    // VALIDASI ELEMENT
    // =====================================

    if (!fileInput) {
        console.error(
            'Element #bulkFile tidak ditemukan.'
        );
        return;
    }

    if (!columnSelect) {
        console.error(
            'Element #bulkColumn tidak ditemukan.'
        );
        return;
    }

    if (!processBtn) {
        console.error(
            'Element #bulkProcessBtn tidak ditemukan.'
        );
        return;
    }


    // =====================================
    // STATE
    // =====================================

    let rows = [];

    let headers = [];

    let resultRows = [];


    // =====================================
    // CSV PARSER
    // =====================================

    function parseCSV(text) {

        const lines =
            String(text)
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .split('\n')
                .filter(
                    line =>
                        line.trim() !== ''
                );


        if (!lines.length) {
            return [];
        }


        return lines.map(
            parseCSVLine
        );
    }


    function parseCSVLine(line) {

        const result = [];

        let current = '';

        let insideQuotes = false;


        for (
            let i = 0;
            i < line.length;
            i++
        ) {

            const char =
                line[i];


            if (char === '"') {

                if (
                    insideQuotes &&
                    line[i + 1] === '"'
                ) {

                    current += '"';

                    i++;

                } else {

                    insideQuotes =
                        !insideQuotes;

                }

                continue;
            }


            if (
                char === ',' &&
                !insideQuotes
            ) {

                result.push(
                    current
                );

                current = '';

            } else {

                current += char;

            }

        }


        result.push(
            current
        );


        return result;
    }


    // =====================================
    // LOAD CSV / XLSX
    // =====================================

    fileInput.addEventListener(
        'change',
        async () => {

            const file =
                fileInput.files[0];


            if (!file) {
                return;
            }


            const fileName =
                file.name.toLowerCase();


            try {

                // ---------------------------------
                // CSV
                // ---------------------------------

                if (
                    fileName.endsWith('.csv')
                ) {

                    await loadCSV(
                        file
                    );

                }


                // ---------------------------------
                // XLSX
                // ---------------------------------

                else if (
                    fileName.endsWith('.xlsx')
                ) {

                    await loadXLSX(
                        file
                    );

                }


                // ---------------------------------
                // INVALID
                // ---------------------------------

                else {

                    alert(
                        'Gunakan file CSV atau Excel (.xlsx).'
                    );

                    fileInput.value = '';

                    return;
                }


                // ---------------------------------
                // SETUP UI
                // ---------------------------------

                if (
                    !headers.length ||
                    !rows.length
                ) {

                    alert(
                        'File tidak memiliki data yang cukup.'
                    );

                    return;
                }


                populateColumns();


                if (columnArea) {

                    columnArea.classList.remove(
                        'hidden'
                    );

                }


                if (options) {

                    options.classList.remove(
                        'hidden'
                    );

                }


                processBtn.disabled =
                    false;


                resultRows = [];


                if (previewArea) {

                    previewArea.classList.add(
                        'hidden'
                    );

                }


                if (downloadExcelBtn) {

                    downloadExcelBtn.classList.add(
                        'hidden'
                    );

                }

            } catch (error) {

                console.error(
                    'Load file error:',
                    error
                );


                alert(
                    error.message ||
                    'Gagal membaca file.'
                );

            }

        }
    );


    // =====================================
    // LOAD CSV
    // =====================================

    async function loadCSV(file) {

        const text =
            await file.text();


        const data =
            parseCSV(text);


        if (
            !data.length ||
            data.length < 2
        ) {

            throw new Error(
                'File CSV tidak memiliki data yang cukup.'
            );

        }


        headers =
            data[0].map(
                (header, index) =>
                    String(
                        header ||
                        `Kolom ${index + 1}`
                    ).trim()
            );


        rows =
            data
                .slice(1)
                .map(row => {

                    const obj = {};


                    headers.forEach(
                        (header, index) => {

                            obj[header] =
                                row[index] ??
                                '';

                        }
                    );


                    return obj;

                });
    }

 
    // =====================================
    // LOAD XLSX
    // =====================================

    async function loadXLSX(file) {

        if (!file) {
            throw new Error(
                'File Excel tidak ditemukan.'
            );
        }


        if (
            !file.name
                .toLowerCase()
                .endsWith('.xlsx')
        ) {

            throw new Error(
                'File harus berformat XLSX.'
            );

        }


        const formData =
            new FormData();

        formData.append(
            'file',
            file
        );


        const response =
            await fetch(
                '/api/number-to-text/read-excel',
                {
                    method: 'POST',
                    body: formData
                }
            );


        if (!response.ok) {

            let message =
                'Gagal membaca file Excel.';

            try {

                const error =
                    await response.json();

                message =
                    error.message ||
                    message;

            } catch {}

            throw new Error(message);
        }


        const result =
            await response.json();


        if (
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Gagal membaca file Excel.'
            );

        }


        return result.data;
    }


    // =====================================
    // COLUMN SELECT
    // =====================================

    function populateColumns() {

        columnSelect.innerHTML = '';


        headers.forEach(
            (header, index) => {

                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    header;


                option.textContent =
                    `${index + 1}. ${header}`;


                columnSelect.appendChild(
                    option
                );

            }
        );


        // Otomatis cari kolom nominal

        const nominalColumn =
            headers.find(
                header =>
                    /nominal|jumlah|harga|nilai|amount|total/i
                        .test(header)
            );


        if (nominalColumn) {

            columnSelect.value =
                nominalColumn;

        }

    }


    // =====================================
    // ANGKA
    // =====================================

    const angka = [
        'nol',
        'satu',
        'dua',
        'tiga',
        'empat',
        'lima',
        'enam',
        'tujuh',
        'delapan',
        'sembilan',
        'sepuluh',
        'sebelas'
    ];


    const satuan = [
        '',
        'ribu',
        'juta',
        'miliar',
        'triliun',
        'kuadriliun',
        'kuintiliun'
    ];


    // =====================================
    // 3 DIGIT
    // =====================================

    function tigaDigit(n) {

        n = Number(n);


        if (n === 0) {
            return '';
        }


        if (n < 12) {
            return angka[n];
        }


        if (n < 20) {

            return (
                `${angka[n - 10]} belas`
            );

        }


        if (n < 100) {

            const puluh =
                Math.floor(
                    n / 10
                );


            const sisa =
                n % 10;


            return (
                `${angka[puluh]} puluh ${tigaDigit(sisa)}`
            ).trim();

        }


        if (n < 200) {

            return (
                `seratus ${tigaDigit(n - 100)}`
            ).trim();

        }


        const ratus =
            Math.floor(
                n / 100
            );


        const sisa =
            n % 100;


        return (
            `${angka[ratus]} ratus ${tigaDigit(sisa)}`
        ).trim();
    }


    // =====================================
    // TERBILANG INTEGER
    // =====================================

    function terbilangInteger(number) {

        number =
            String(number)
                .replace(/^0+/, '') ||
            '0';


        if (number === '0') {

            return 'nol';

        }


        const groups = [];


        while (
            number.length > 0
        ) {

            groups.unshift(
                Number(
                    number.slice(-3)
                )
            );


            number =
                number.slice(
                    0,
                    -3
                );

        }


        const words = [];


        groups.forEach(
            (group, index) => {

                if (group === 0) {
                    return;
                }


                const satuanIndex =
                    groups.length -
                    index -
                    1;


                // 1.000 = seribu

                if (
                    satuanIndex === 1 &&
                    group === 1
                ) {

                    words.push(
                        'seribu'
                    );

                    return;
                }


                const text =
                    tigaDigit(
                        group
                    );


                if (text) {

                    words.push(
                        text
                    );

                }


                if (
                    satuan[satuanIndex]
                ) {

                    words.push(
                        satuan[satuanIndex]
                    );

                }

            }
        );


        return words.join(
            ' '
        );
    }


    // =====================================
    // PARSE VALUE
    // =====================================

    function parseValue(value) {

        let text =
            String(
                value ?? ''
            )
                .trim()
                .toLowerCase();


        if (!text) {

            return null;

        }


        const negative =
            text.startsWith('-');


        text =
            text.replace(
                /^-/,
                ''
            );


        text =
            text.replace(
                /rp\.?/gi,
                ''
            );


        text =
            text.replace(
                /rupiah/gi,
                ''
            );


        text =
            text.replace(
                /\s/g,
                ''
            );


        // ---------------------------------
        // DESIMAL
        // ---------------------------------

        if (
            text.includes(',')
        ) {

            const parts =
                text.split(',');


            if (
                parts.length !== 2
            ) {

                return null;

            }


            const integer =
                parts[0]
                    .replace(
                        /\./g,
                        ''
                    );


            const decimal =
                parts[1];


            if (
                !/^\d+$/.test(
                    integer
                )
            ) {

                return null;

            }


            if (
                !/^\d+$/.test(
                    decimal
                )
            ) {

                return null;

            }


            return {
                integer,
                decimal,
                negative
            };

        }


        // ---------------------------------
        // INTEGER
        // ---------------------------------

        const integer =
            text.replace(
                /\./g,
                ''
            );


        if (
            !/^\d+$/.test(
                integer
            )
        ) {

            return null;

        }


        return {
            integer,
            decimal: '',
            negative
        };

    }


    // =====================================
    // CONVERT
    // =====================================

    function convert(value) {

        const parsed =
            parseValue(
                value
            );


        if (!parsed) {

            return '';

        }


        let text =
            terbilangInteger(
                parsed.integer
            );


        // ---------------------------------
        // NEGATIF
        // ---------------------------------

        if (
            parsed.negative
        ) {

            text =
                `minus ${text}`;

        }


        // ---------------------------------
        // RUPIAH
        // ---------------------------------

        if (
            rupiah &&
            rupiah.checked
        ) {

            text +=
                ' rupiah';


            if (
                parsed.decimal &&
                Number(
                    parsed.decimal
                ) !== 0
            ) {

                const sen =
                    terbilangInteger(
                        parsed.decimal
                    );


                text +=
                    ` dan ${sen} sen`;

            }

        }


        // ---------------------------------
        // DESIMAL BIASA
        // ---------------------------------

        else if (
            parsed.decimal &&
            Number(
                parsed.decimal
            ) !== 0
        ) {

            text +=
                ' koma ' +
                parsed.decimal
                    .split('')
                    .map(
                        digit =>
                            angka[
                                Number(digit)
                            ]
                    )
                    .join(' ');

        }


        // ---------------------------------
        // CAPITAL
        // ---------------------------------

        if (
            capital &&
            capital.checked
        ) {

            text =
                text.charAt(0)
                    .toUpperCase() +
                text.slice(1);

        }


        return text;
    }


    // =====================================
    // PROCESS
    // =====================================

    processBtn.addEventListener(
        'click',
        () => {

            const selectedColumn =
                columnSelect.value;


            if (!selectedColumn) {

                alert(
                    'Pilih kolom nominal terlebih dahulu.'
                );

                return;

            }


            resultRows =
                rows.map(
                    row => {

                        return {
                            ...row,

                            Terbilang:
                                convert(
                                    row[
                                        selectedColumn
                                    ]
                                )
                        };

                    }
                );


            renderPreview();

        }
    );


    // =====================================
    // PREVIEW
    // =====================================

    function renderPreview() {

        if (!tableHead ||
            !tableBody) {

            return;

        }


        tableHead.innerHTML = '';

        tableBody.innerHTML = '';


        const headerRow =
            document.createElement(
                'tr'
            );


        [
            ...headers,
            'Terbilang'
        ].forEach(
            header => {

                const th =
                    document.createElement(
                        'th'
                    );


                th.textContent =
                    header;


                th.className =
                    'px-4 py-3 text-left font-semibold';


                headerRow.appendChild(
                    th
                );

            }
        );


        tableHead.appendChild(
            headerRow
        );


        resultRows
            .slice(0, 100)
            .forEach(
                row => {

                    const tr =
                        document.createElement(
                            'tr'
                        );


                    tr.className =
                        'border-t border-slate-200 dark:border-slate-700';


                    [
                        ...headers,
                        'Terbilang'
                    ].forEach(
                        header => {

                            const td =
                                document.createElement(
                                    'td'
                                );


                            td.textContent =
                                row[header] ??
                                '';


                            td.className =
                                'px-4 py-3 whitespace-nowrap';


                            tr.appendChild(
                                td
                            );

                        }
                    );


                    tableBody.appendChild(
                        tr
                    );

                }
            );


        if (count) {

            count.textContent =
                `${resultRows.length} baris diproses`;

        }


        if (previewArea) {

            previewArea.classList.remove(
                'hidden'
            );

        }


        if (downloadExcelBtn) {

            downloadExcelBtn.classList.remove(
                'hidden'
            );

        }

    }


    // =====================================
    // DOWNLOAD CSV
    // =====================================

    if (downloadBtn) {

        downloadBtn.addEventListener(
            'click',
            () => {

                if (
                    !resultRows.length
                ) {

                    alert(
                        'Belum ada data yang diproses.'
                    );

                    return;

                }


                const allHeaders =
                    [
                        ...headers,
                        'Terbilang'
                    ];


                const csvRows = [];


                csvRows.push(
                    allHeaders
                        .map(
                            csvEscape
                        )
                        .join(',')
                );


                resultRows.forEach(
                    row => {

                        csvRows.push(
                            allHeaders
                                .map(
                                    header =>
                                        csvEscape(
                                            row[
                                                header
                                            ] ?? ''
                                        )
                                )
                                .join(',')
                        );

                    }
                );


                const blob =
                    new Blob(
                        [
                            '\uFEFF' +
                            csvRows.join(
                                '\n'
                            )
                        ],
                        {
                            type:
                                'text/csv;charset=utf-8;'
                        }
                    );


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const a =
                    document.createElement(
                        'a'
                    );


                a.href = url;


                a.download =
                    'hasil-terbilang.csv';


                document.body.appendChild(
                    a
                );


                a.click();


                a.remove();


                URL.revokeObjectURL(
                    url
                );

            }
        );

    }


    // =====================================
    // CSV ESCAPE
    // =====================================

    function csvEscape(value) {

        const text =
            String(
                value ?? ''
            );


        if (
            text.includes(',') ||
            text.includes('"') ||
            text.includes('\n')
        ) {

            return (
                '"' +
                text.replace(
                    /"/g,
                    '""'
                ) +
                '"'
            );

        }


        return text;
    }


    // =====================================
    // DOWNLOAD EXCEL VIA SERVER
    // =====================================

    async function uploadExcelToServer(
        file
    ) {

        const formData =
            new FormData();


        formData.append(
            'file',
            file
        );


        const response =
            await fetch(
                '/api/number-to-text/excel',
                {
                    method: 'POST',
                    body: formData
                }
            );


        if (!response.ok) {

            let message =
                'Gagal memproses Excel.';


            try {

                const error =
                    await response.json();


                message =
                    error.message ||
                    message;

            } catch {
                // bukan JSON
            }


            throw new Error(
                message
            );

        }


        const blob =
            await response.blob();


        const url =
            URL.createObjectURL(
                blob
            );


        const a =
            document.createElement(
                'a'
            );


        a.href = url;


        a.download =
            'hasil-terbilang.xlsx';


        document.body.appendChild(
            a
        );


        a.click();


        a.remove();


        URL.revokeObjectURL(
            url
        );

    }

    // const downloadExcelBtn =
    //     document.getElementById(
    //         'bulkDownloadExcelBtn'
    //     );

    if (downloadExcelBtn) {

        downloadExcelBtn.addEventListener(
            'click',
            async () => {

                const file =
                    fileInput.files[0];

                if (!file) {

                    alert(
                        'Pilih file XLSX terlebih dahulu.'
                    );

                    return;
                }

                if (
                    !file.name
                        .toLowerCase()
                        .endsWith('.xlsx')
                ) {

                    alert(
                        'Untuk Download Excel, gunakan file XLSX.'
                    );

                    return;
                }

                try {

                    downloadExcelBtn.disabled =
                        true;

                    downloadExcelBtn.textContent =
                        'Memproses Excel...';


                    await uploadExcelToServer(
                        file
                    );


                } catch (error) {

                    console.error(
                        'Excel error:',
                        error
                    );

                    alert(
                        error.message ||
                        'Gagal memproses Excel.'
                    );


                } finally {

                    downloadExcelBtn.disabled =
                        false;

                    downloadExcelBtn.textContent =
                        'Download Excel Hasil (.xlsx)';

                }

            }
        );

    }
    // =====================================
    // PARSE EXCEL NUMBER
    // =====================================

    function parseExcelNumber(value) {

        if (
            typeof value ===
            'number'
        ) {

            return value;

        }


        let text =
            String(
                value ?? ''
            )
                .trim();


        if (!text) {

            return null;

        }


        text =
            text.replace(
                /rp\.?/gi,
                ''
            );


        text =
            text.replace(
                /rupiah/gi,
                ''
            );


        text =
            text.replace(
                /\s/g,
                ''
            );


        if (
            text.includes(',')
        ) {

            text =
                text
                    .replace(
                        /\./g,
                        ''
                    )
                    .replace(
                        ',',
                        '.'
                    );

        } else {

            text =
                text.replace(
                    /\./g,
                    ''
                );

        }


        const number =
            Number(
                text
            );


        return Number.isFinite(
            number
        )
            ? number
            : null;

    }


    // =====================================
    // CLEAR RESULT
    // =====================================

    [
        rupiah,
        capital,
        columnSelect
    ]
        .forEach(
            element => {

                if (!element) {
                    return;
                }


                element.addEventListener(
                    'change',
                    () => {

                        resultRows =
                            [];


                        if (previewArea) {

                            previewArea.classList.add(
                                'hidden'
                            );

                        }


                        if (downloadExcelBtn) {

                            downloadExcelBtn.classList.add(
                                'hidden'
                            );

                        }

                    }
                );

            }
        );


    // =====================================
    // INITIAL STATE
    // =====================================

    processBtn.disabled = true;


    if (downloadExcelBtn) {

        downloadExcelBtn.classList.add(
            'hidden'
        );

    }

});