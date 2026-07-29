// Submits the contact form to Google Apps Script without leaving the page.

document.addEventListener('DOMContentLoaded', () => {
    const maximumPitchDeckSize = 10 * 1024 * 1024;

    const createRequestId = () => {
        if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');

        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    };

    document.querySelectorAll('[data-contact-form]').forEach((form, index) => {
        const submitButton = form.querySelector('[data-submit-button]');
        const submitLabel = form.querySelector('[data-submit-label]');
        const status = form.querySelector('[data-form-status]');
        const pitchDeckInput = form.querySelector('[data-pitch-deck]');
        const pitchDeckName = form.querySelector('[data-pitch-deck-name]');
        const pitchDeckData = form.querySelector('[data-pitch-deck-data]');
        const requestId = form.querySelector('[data-request-id]');

        if (!submitButton || !submitLabel || !status || !pitchDeckInput || !pitchDeckName || !pitchDeckData || !requestId) return;

        const defaultLabel = submitLabel.textContent;
        const endpointIsConfigured = /^https:\/\/script\.google\.com\/macros\/s\/[a-z0-9_-]+\/exec$/i.test(form.action);
        const responseFrame = document.createElement('iframe');
        const responseFrameName = `onx-contact-form-response-${index}`;
        let responseTimeout;
        let submissionPending = false;
        let preparedPitchDeck = null;
        let pitchDeckPreparation = null;

        requestId.value = createRequestId();

        responseFrame.name = responseFrameName;
        responseFrame.hidden = true;
        responseFrame.tabIndex = -1;
        responseFrame.setAttribute('aria-hidden', 'true');
        form.insertAdjacentElement('afterend', responseFrame);
        form.target = responseFrameName;

        const showStatus = (message, type) => {
            status.textContent = message;
            status.classList.toggle('is-success', type === 'success');
            status.classList.toggle('is-error', type === 'error');
        };

        const setSubmitting = isSubmitting => {
            submitButton.disabled = isSubmitting;
            submitButton.setAttribute('aria-busy', String(isSubmitting));
            submitLabel.textContent = isSubmitting ? form.dataset.sendingLabel : defaultLabel;
        };

        const finishSubmission = (success, message) => {
            window.clearTimeout(responseTimeout);
            submissionPending = false;
            setSubmitting(false);

            if (success) {
                form.reset();
                preparedPitchDeck = null;
                pitchDeckPreparation = null;
                pitchDeckName.value = '';
                pitchDeckData.value = '';
                requestId.value = createRequestId();
            }

            showStatus(message, success ? 'success' : 'error');
            status.focus({ preventScroll: true });
        };

        window.addEventListener('message', event => {
            const responseIsFromGoogle = event.origin === 'https://script.google.com'
                || event.origin.endsWith('.googleusercontent.com');
            const responseIsValid = event.data?.type === 'onx-form-response'
                && typeof event.data.success === 'boolean'
                && event.data.requestId === requestId.value;

            if (!submissionPending || !responseIsFromGoogle || !responseIsValid) return;

            finishSubmission(
                event.data.success,
                event.data.success ? form.dataset.successMessage : form.dataset.errorMessage
            );
        });

        const validatePitchDeck = file => {
            const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
            const hasPdfMimeType = !file.type || file.type === 'application/pdf';

            if (!hasPdfExtension || !hasPdfMimeType) {
                return form.dataset.fileTypeMessage;
            }

            return file.size > maximumPitchDeckSize
                ? form.dataset.fileSizeMessage
                : '';
        };

        const preparePitchDeck = file => {
            if (preparedPitchDeck === file) return Promise.resolve(true);
            if (pitchDeckPreparation?.file === file) return pitchDeckPreparation.promise;

            const reader = new FileReader();
            const promise = new Promise(resolve => {
                reader.addEventListener('load', () => {
                    if (pitchDeckInput.files[0] !== file) {
                        resolve(false);
                        return;
                    }

                    const result = String(reader.result || '');
                    const separatorIndex = result.indexOf(',');

                    if (separatorIndex === -1) {
                        resolve(false);
                        return;
                    }

                    pitchDeckName.value = file.name;
                    pitchDeckData.value = result.slice(separatorIndex + 1);
                    preparedPitchDeck = file;
                    resolve(true);
                });
                reader.addEventListener('error', () => resolve(false));
                reader.readAsDataURL(file);
            });

            pitchDeckPreparation = { file, promise };
            promise.finally(() => {
                if (pitchDeckPreparation?.file === file) pitchDeckPreparation = null;
            });

            return promise;
        };

        pitchDeckInput.addEventListener('change', () => {
            const file = pitchDeckInput.files[0];

            preparedPitchDeck = null;
            pitchDeckName.value = '';
            pitchDeckData.value = '';
            showStatus('', null);

            if (!file) return;

            const validationMessage = validatePitchDeck(file);

            if (validationMessage) {
                pitchDeckInput.value = '';
                showStatus(validationMessage, 'error');
                status.focus({ preventScroll: true });
                return;
            }

            preparePitchDeck(file).then(success => {
                if (!success && pitchDeckInput.files[0] === file && !submissionPending) {
                    showStatus(form.dataset.errorMessage, 'error');
                    status.focus({ preventScroll: true });
                }
            });
        });

        form.addEventListener('submit', event => {
            showStatus('', null);

            if (!endpointIsConfigured) {
                event.preventDefault();
                showStatus(form.dataset.configMessage, 'error');
                status.focus({ preventScroll: true });
                return;
            }

            if (submissionPending) {
                event.preventDefault();
                return;
            }

            const pitchDeck = pitchDeckInput.files[0];

            if (pitchDeck) {
                const validationMessage = validatePitchDeck(pitchDeck);

                if (validationMessage) {
                    event.preventDefault();
                    showStatus(validationMessage, 'error');
                    status.focus({ preventScroll: true });
                    return;
                }
            }

            if (pitchDeck && preparedPitchDeck !== pitchDeck) {
                event.preventDefault();

                submissionPending = true;
                setSubmitting(true);
                preparePitchDeck(pitchDeck).then(success => {
                    submissionPending = false;

                    if (!success) {
                        finishSubmission(false, form.dataset.errorMessage);
                        return;
                    }

                    form.requestSubmit();
                });
                return;
            }

            if (!requestId.value) requestId.value = createRequestId();

            submissionPending = true;
            setSubmitting(true);
            responseTimeout = window.setTimeout(() => {
                if (submissionPending) finishSubmission(false, form.dataset.errorMessage);
            }, 90000);
        });
    });

    initCustomSelects();
});

// Custom Select Component for Contact Forms
function initCustomSelects() {
    const selects = document.querySelectorAll('.contact-field select');

    selects.forEach(select => {
        if (select.dataset.customSelectInit) return;
        select.dataset.customSelectInit = 'true';

        const parentField = select.closest('.contact-field');
        const fieldLabel = parentField ? parentField.querySelector('.contact-field-label') : null;

        // Hide original select visually while preserving accessibility and form validity
        select.classList.add('is-hidden-for-custom');

        // Create Custom Select Elements
        const container = document.createElement('div');
        container.className = 'custom-select';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        if (select.id) {
            trigger.id = `${select.id}-custom-trigger`;
            if (fieldLabel) {
                fieldLabel.style.cursor = 'pointer';
                fieldLabel.addEventListener('click', (e) => {
                    e.preventDefault();
                    trigger.focus();
                    if (!container.classList.contains('is-open')) {
                        openDropdown();
                    } else {
                        closeDropdown();
                    }
                });
            }
        }

        const valueSpan = document.createElement('span');
        valueSpan.className = 'custom-select-value';

        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'custom-select-arrow';
        arrowSpan.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><polyline points="6 9 12 15 18 9"></polyline></svg>';

        trigger.appendChild(valueSpan);
        trigger.appendChild(arrowSpan);

        const optionsList = document.createElement('ul');
        optionsList.className = 'custom-select-options';
        optionsList.setAttribute('role', 'listbox');
        optionsList.style.listStyle = 'none';
        optionsList.style.padding = '6px';
        optionsList.style.margin = '0';
        if (select.id) optionsList.id = `${select.id}-custom-options`;

        trigger.setAttribute('aria-controls', optionsList.id);

        let placeholderText = '';
        const optionItems = [];

        Array.from(select.options).forEach(opt => {
            if (opt.disabled || opt.value === '') {
                if (!placeholderText) placeholderText = opt.text;
                return;
            }

            const li = document.createElement('li');
            li.className = 'custom-select-option';
            li.setAttribute('role', 'option');
            li.setAttribute('data-value', opt.value);
            li.setAttribute('aria-selected', select.value === opt.value ? 'true' : 'false');
            li.style.listStyle = 'none';

            const optText = document.createElement('span');
            optText.textContent = opt.text;
            li.appendChild(optText);

            const checkmarkSpan = document.createElement('span');
            checkmarkSpan.className = 'custom-select-option-checkmark';
            checkmarkSpan.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;display:block;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            li.appendChild(checkmarkSpan);

            if (select.value === opt.value) {
                li.classList.add('is-selected');
            }

            li.addEventListener('click', (e) => {
                e.stopPropagation();
                selectOption(opt.value);
                closeDropdown();
                trigger.focus();
            });

            optionsList.appendChild(li);
            optionItems.push({ element: li, value: opt.value, text: opt.text });
        });

        const updateDisplay = () => {
            const selectedOpt = select.options[select.selectedIndex];
            if (selectedOpt && selectedOpt.value !== '' && !selectedOpt.disabled) {
                valueSpan.textContent = selectedOpt.text;
                valueSpan.classList.remove('is-placeholder');
                container.classList.add('has-value');
            } else {
                valueSpan.textContent = placeholderText || (select.options[0] ? select.options[0].text : '');
                valueSpan.classList.add('is-placeholder');
                container.classList.remove('has-value');
            }

            optionItems.forEach(item => {
                const isSel = item.value === select.value;
                item.element.classList.toggle('is-selected', isSel);
                item.element.setAttribute('aria-selected', String(isSel));
            });
        };

        const selectOption = val => {
            select.value = val;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            updateDisplay();
            if (parentField) parentField.classList.remove('is-invalid');
        };

        const openDropdown = () => {
            document.querySelectorAll('.custom-select.is-open').forEach(openSel => {
                if (openSel !== container) {
                    openSel.classList.remove('is-open');
                    const openTrigger = openSel.querySelector('.custom-select-trigger');
                    if (openTrigger) openTrigger.setAttribute('aria-expanded', 'false');
                }
            });

            container.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
        };

        const closeDropdown = () => {
            container.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
            focusedIndex = -1;
            optionItems.forEach(item => item.element.classList.remove('is-focused'));
        };

        const toggleDropdown = () => {
            if (container.classList.contains('is-open')) {
                closeDropdown();
            } else {
                openDropdown();
            }
        };

        let focusedIndex = -1;

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            toggleDropdown();
        });

        trigger.addEventListener('keydown', (e) => {
            const isOpen = container.classList.contains('is-open');

            if (e.key === 'ArrowDown' || e.key === 'Down') {
                e.preventDefault();
                if (!isOpen) {
                    openDropdown();
                    focusedIndex = optionItems.findIndex(item => item.value === select.value);
                    if (focusedIndex === -1) focusedIndex = 0;
                } else {
                    focusedIndex = (focusedIndex + 1) % optionItems.length;
                }
                highlightFocusedOption();
            } else if (e.key === 'ArrowUp' || e.key === 'Up') {
                e.preventDefault();
                if (!isOpen) {
                    openDropdown();
                    focusedIndex = optionItems.findIndex(item => item.value === select.value);
                    if (focusedIndex === -1) focusedIndex = optionItems.length - 1;
                } else {
                    focusedIndex = (focusedIndex - 1 + optionItems.length) % optionItems.length;
                }
                highlightFocusedOption();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!isOpen) {
                    openDropdown();
                } else if (focusedIndex >= 0 && focusedIndex < optionItems.length) {
                    const item = optionItems[focusedIndex];
                    selectOption(item.value);
                    closeDropdown();
                }
            } else if (e.key === 'Escape' || e.key === 'Esc') {
                if (isOpen) {
                    e.preventDefault();
                    closeDropdown();
                }
            } else if (e.key === 'Tab') {
                if (isOpen) {
                    closeDropdown();
                }
            }
        });

        const highlightFocusedOption = () => {
            optionItems.forEach((item, index) => {
                if (index === focusedIndex) {
                    item.element.classList.add('is-focused');
                    item.element.scrollIntoView({ block: 'nearest' });
                } else {
                    item.element.classList.remove('is-focused');
                }
            });
        };

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                closeDropdown();
            }
        });

        const form = select.form;
        if (form) {
            form.addEventListener('reset', () => {
                setTimeout(updateDisplay, 10);
            });
        }

        select.addEventListener('invalid', () => {
            if (parentField) {
                parentField.classList.add('is-invalid');
                setTimeout(() => parentField.classList.remove('is-invalid'), 1200);
            }
            trigger.focus();
        });

        updateDisplay();

        container.appendChild(trigger);
        container.appendChild(optionsList);
        select.parentNode.insertBefore(container, select.nextSibling);
    });
}
