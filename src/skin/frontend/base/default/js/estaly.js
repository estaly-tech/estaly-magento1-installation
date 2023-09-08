const Estaly = {
    API_URL: "",
    API_KEY: "",

    init(apiUrl, apiKey) {
        this.API_URL = apiUrl;
        this.API_KEY = apiKey;
    },

    async getOffers(variantReferenceIds) {
        const url = `${this.API_URL}/merchant/offers?reference_ids=${variantReferenceIds}`

        let data = null
        await fetch(url, { headers: { Authorization: this.API_KEY } })
            .then((response) => {
                if(response.ok){
                    data = response.json();
                }
            })
            .catch((error) => {
                console.log(error)
            });

        return data;
    },
}

const PDP = {
    selectedPlanId: null,

    async init({variantReferenceId, addToCartButtonClass, modalFeatureEnabled, websiteUrl, mainWebsiteUrl}) {
        if (!variantReferenceId) {
            return
        }

        const data = await Estaly.getOffers(variantReferenceId);

        if (data == undefined && data == null) {
            return;
        }

        const combinationReferenceId = variantReferenceId;
        const offers = data.offers;
        const relevantOffer = offers.filter((offer) => offer.productVariantId === combinationReferenceId)[0];

        if (!relevantOffer) {
            return;
        }

        const plans = relevantOffer.plans;
        const planDetailsUrl = data.marketing.modal.planDetailsUrl;

        await this.insertPlans(plans, planDetailsUrl);
        this.fillButtonsMarketing(data.marketing.buttons);
        this.initButtons(combinationReferenceId, addToCartButtonClass, websiteUrl, mainWebsiteUrl);
        this.displayButtons();

        if(modalFeatureEnabled){
            PdpModal.fillModalMarketing(data.marketing.modal);
            PdpModal.initModal({ afterAddToCartCallback: () => {}}, combinationReferenceId, data);
        }

        return this;
    },

    setButtonsState(parentClass = "") {
        const offerButtons = document.querySelectorAll(`${parentClass} .estaly-offer-button`);
        offerButtons.forEach((offerButton) => {
            if (offerButton.dataset.planVariantId === this.selectedPlanId) {
                offerButton.classList.add("active");
            } else {
                offerButton.classList.remove("active");
            }
        })
    },

    removeButtonsState() {
        const offerButtons = document.querySelectorAll(`.estaly-offer-button`);
        offerButtons.forEach((offerButton) => {
            offerButton.classList.remove("active");
        })
    },

    fillButtonsMarketing(buttonsMarketingDetails) {
        const buttons = document.querySelector(".estaly-pdp-offering")

        if (buttons) {
            buttons.querySelector(".estaly-headline-buttons").innerText = buttonsMarketingDetails.headline
            buttons.querySelector(".estaly-link-buttons").innerText = buttonsMarketingDetails.linkText
        }
    },

    initButtons(variantReferenceId, addToCartButtonClass, websiteUrl, mainWebsiteUrl) {
        const offerButtons = document.querySelectorAll(".estaly-offer-button");
        const termsDiv = document.getElementsByClassName("estaly-terms-and-conditions")[0];
        offerButtons.forEach((offerButton) => {
            offerButton.addEventListener("click", () => {
                if (offerButton.dataset.planVariantId === this.selectedPlanId) {
                    this.selectedPlanId = null;
                    termsDiv.style.display = 'none';
                } else {
                    this.selectedPlanId = offerButton.dataset.planVariantId;
                    termsDiv.style.display = 'block';
                }
                this.setButtonsState();
            })
        })

        const learnMoreButton = document.querySelector(".estaly-link-buttons");
        learnMoreButton.addEventListener("click", () => {
            PdpModal.openModal(false);
        })

        const addToCartButton = document.getElementsByClassName(addToCartButtonClass)[0];
        addToCartButton.estalyVariantSelected = variantReferenceId;
        addToCartButton.addEventListener("click", (evt) => this.addOfferToCart(evt, websiteUrl, mainWebsiteUrl));
    },

    displayButtons() {
        const offerButtonsContainer = document.querySelector(".estaly-pdp-offering");
        if (offerButtonsContainer) {
            offerButtonsContainer.style.display = "block";
        }
    },

    async insertPlans(plans, planDetailsUrl) {
        if (plans.length === 0) {
            return
        }

        const pdpOfferings = document.getElementsByClassName("estaly-pdp-offering")[0];

        const offerButtonGroupComponent = pdpOfferings.getElementsByClassName("estaly-button-group")[0];

        if (plans.length > 0 && plans.length === 1) {
            PDP.createUniqOfferButton(offerButtonGroupComponent, plans[0])
        } else {
            plans.forEach((plan) => {
                PDP.createOfferButton(offerButtonGroupComponent, plan);
            })
        }

        PDP.createTermsDiv(planDetailsUrl);
    },

    createUniqOfferButton(parentComponent, plan) {
        parentComponent.classList.add('uniq');
        const offerButton = document.createElement('div');
        offerButton.setAttribute('class', 'estaly-offer-button uniq');
        offerButton.dataset.planVariantId = plan.offerVariantId;

        const checkboxTextDiv = document.createElement('div');
        checkboxTextDiv.setAttribute('class', 'estaly-offer-uniq-button-left-side uniq');

        const offerButtonCheckbox = document.createElement('div');
        offerButtonCheckbox.innerHTML = '✓';
        offerButtonCheckbox.setAttribute('class', 'estaly-offer-uniq-button-checkbox');
        checkboxTextDiv.appendChild(offerButtonCheckbox);

        const textOfferButton = document.createElement('div');
        textOfferButton.setAttribute('class', 'estaly-offer-uniq-button-title');
        textOfferButton.innerText = `${plan.title}`;
        checkboxTextDiv.appendChild(textOfferButton);

        offerButton.appendChild(checkboxTextDiv);

        const spanPriceElement = document.createElement('span');
        spanPriceElement.setAttribute('class', 'estaly-offer-uniq-button-price');
        spanPriceElement.innerText = `${plan.price}`;
        offerButton.appendChild(spanPriceElement);

        parentComponent.appendChild(offerButton);
    },

    createOfferButton(parentComponent, plan){
        parentComponent.classList.add('multiple');
        const offerButton = document.createElement('div');
        offerButton.dataset.planVariantId = plan.offerVariantId
        offerButton.setAttribute('class', 'estaly-offer-button multiple');
        parentComponent.appendChild(offerButton);

        const spanGroupElement = document.createElement('span');
        spanGroupElement.setAttribute('class', "estaly-flex estaly-flex-col");
        offerButton.appendChild(spanGroupElement);

        const spanTermLength = document.createElement('span');
        spanTermLength.setAttribute('class', 'estaly-offer-term-length');
        spanGroupElement.appendChild(spanTermLength);
        spanTermLength.innerText = plan.termLength;

        const spanPrice = document.createElement('span');
        spanPrice.setAttribute('class', 'estaly-offer-price mt-2');
        spanGroupElement.appendChild(spanPrice);
        spanPrice.innerText = plan.price

        return offerButton;
    },

    createTermsDiv(planDetailsUrl) {
        const termsDiv = document.createElement('div');
        termsDiv.setAttribute('class', 'estaly-terms-and-conditions');
        termsDiv.style.display = 'none'; // Initially hidden
    
        // Create the link elements
        const termsLink = document.createElement('a');
        termsLink.setAttribute('href', planDetailsUrl);
        termsLink.setAttribute('target', '_blank');
        termsLink.style.textDecoration = 'underline'; 
        termsLink.style.color = '#647259';
        termsLink.innerText = 'termes et conditions';
    
        const infoLink = document.createElement('a');
        infoLink.setAttribute('href', planDetailsUrl);
        infoLink.setAttribute('target', '_blank');
        infoLink.style.textDecoration = 'underline';
        infoLink.style.color = '#647259';
        infoLink.innerText = 'fiche d’information';
    
        // Insert the text and the links into termsDiv
        termsDiv.innerHTML = 'En souscrivant ce contrat, vous acceptez les ';
        termsDiv.appendChild(termsLink);
        termsDiv.innerHTML += ' et la ';
        termsDiv.appendChild(infoLink);
        termsDiv.innerHTML += '.';
    
        // Get the estaly-learn-more div
        const learnMoreDiv = document.querySelector('.estaly-learn-more');
    
        // Insert the terms div before the learnMoreDiv
        learnMoreDiv.parentNode.insertBefore(termsDiv, learnMoreDiv);
    
        return termsDiv;
    },

    addOfferToCart(evt, websiteUrl, mainWebsiteUrl) {
        const variantReferenceId = evt.currentTarget.estalyVariantSelected;
        offerButtonActive = document.querySelector(".estaly-offer-button.active")
        if (offerButtonActive !== null) {
            const selectedPlanId = offerButtonActive.dataset.planVariantId;
            Magento1.addOfferToCart(selectedPlanId, variantReferenceId, websiteUrl, mainWebsiteUrl);
        }
    },

    async updateEstalyWidget(variantSelectedId, addToCartButtonClass){

        var setButtons = document.querySelector(".estaly-pdp-offering").css("display") == "none";

        const data = await Estaly.getOffers(variantSelectedId);

        const combinationReferenceId = data.variantReferenceId;
        const offers = data.offers;
        const relevantOffer = offers.filter((offer) => offer.productVariantId === combinationReferenceId)[0];
        const plans = relevantOffer.plans;
        
        this.removeButtonsState();
        await this.insertPlans(plans);

        const addToCartButton = document.getElementsByClassName(addToCartButtonClass)[0];
        addToCartButton.estalyVariantSelected = variantSelectedId;

        this.fillButtonsMarketing(data.marketing.buttons);
        if (setButtons) {
            this.initButtons(combinationReferenceId, addToCartButtonClass);
        }
        this.displayButtons();

        PdpModal.fillModalMarketing(data.marketing.modal);
        PdpModal.initModal({ afterAddToCartCallback: () => {}}, variantSelectedId, data);
    },

}

const PdpModal = {
    selectedOfferId: null,
    initialized: false,

    initModal({afterAddToCartCallback}, variantReferenceId, data) {
        this.fillModalMarketing(data.marketing.modal);

        const closeModalButton = document.querySelector(".estaly-modal-dialog .estaly-close")
        closeModalButton.addEventListener("click", this.closeModal)

        this.initialized = true;
    },

    fillModalMarketing(modalMarketingDetails) {
        const modal = document.querySelector(".estaly-modal-dialog");

        if (modal) {
            modal.querySelector("h2").innerText = modalMarketingDetails.headline;
            modal.querySelector(".estaly-coverage-header").innerText = modalMarketingDetails.coverageBulletsHeading;

            const bulletPoints = modal.querySelectorAll(".estaly-list .estaly-list-item");
            bulletPoints.forEach((bulletPoint, index) => {
                bulletPoint.innerText = modalMarketingDetails.bulletPoints[index];
            })

            modal.querySelector(".estaly-terms-link").innerText = modalMarketingDetails.linkText;
            modal.querySelector(".estaly-terms-link").href = modalMarketingDetails.planDetailsUrl;
            modal.querySelector(".estaly-merchant-logo").src = modalMarketingDetails.merchantLogo;
            modal.querySelector(".estaly-offered-by").innerText = modalMarketingDetails.legalText;

            const modalLearnMoreImage = modal.querySelector(".estaly-learn-more-image");
            if (modalLearnMoreImage !== undefined && modalLearnMoreImage !== null){
                modalLearnMoreImage.src = modalMarketingDetails.image;
            }
        }
    },

    openModal(withButtons) {
        if (this.initialized) {
            const modal = document.querySelector(".estaly-modal-dialog")
            modal.style.display = "flex"
        }
    },

    closeModal() {
        const modal = document.querySelector(".estaly-modal-dialog")
        modal.style.display = "none"
    },

}


const Magento1 = {
    fetchOptionIdUrl: '<?php echo $fetchOptionIdUrl; ?>',

    async getOptionIdFromProductId(productId, mainWebsiteUrl) {
        return new Promise((resolve, reject) => {
            jQuery.ajax({
                url: `${mainWebsiteUrl}/estalymodule/productoptions/fetchOptionId/?productId=${productId}`,
                type: 'GET',
                data: { productId: productId },
                dataType: 'json',
                success: function(data) {
                    if (data.success && data.optionId) {
                        resolve(data.optionId);
                    } else {
                        reject(new Error("Failed to fetch optionId"));
                    }
                },
                error: function(error) {
                    reject(error);
                }
            });
        });
    },

    async addOfferToCart(productId, variantReferenceId, websiteUrl, mainWebsiteUrl) {
        try {
            const optionId = await this.getOptionIdFromProductId(productId, mainWebsiteUrl);

            if (!optionId) return;  // Si optionId est null ou undefined, arrêtez l'exécution ici

            const formKey = document.querySelector('input[name="form_key"]').value;
            const url = `${websiteUrl}/checkout/cart/add/product/${productId}/`;
            const data = {
                product: productId,
                qty: 1,
                form_key: formKey,
                options: {
                    [optionId]: variantReferenceId  // Utilisez optionId comme clé dynamique
                }
            };

            jQuery.ajax({
                type: "POST",
                url: url,
                data: data,
                success: function(result) {
                    window.location.reload();
                },
                error: function(error) {
                    console.log(error);
                }
            });
        } catch (error) {
            console.error("Erreur lors de l'ajout de l'offre au panier", error);
        }
    }
}