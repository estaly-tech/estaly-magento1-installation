<?php

class Estaly_EstalyModule_ProductOptionsController extends Mage_Core_Controller_Front_Action
{
    /**
     * Action pour récupérer l'ID de l'option d'un produit
     */
    public function fetchOptionIdAction()
    {
        $response = array('success' => false, 'optionId' => null);

        try {
            // Récupération de l'ID du produit depuis les paramètres de la requête
            $productId = $this->getRequest()->getParam('productId');

            if ($productId) {
                $product = Mage::getModel('catalog/product')->load($productId);
                $options = $product->getOptions();

                if (count($options)) {
                    $firstOption = reset($options);
                    $optionId = $firstOption->getId();
                    
                    $response['success'] = true;
                    $response['optionId'] = $optionId;
                }
            }
        } catch (Exception $e) {
            $response['error'] = $e->getMessage();
        }

        // Réponse au format JSON
        $this->getResponse()->setHeader('Content-type', 'application/json');
        $this->getResponse()->setBody(json_encode($response));
    }
}
