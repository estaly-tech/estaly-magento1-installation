<?php

class Estaly_EstalyModule_Model_Observer
{
    private function getApiBaseUrl() {
        return Mage::getStoreConfig('estalymodule/settings/estalyApiUrl');
    }

    private function getApiKey($websiteId) {
        return Mage::getStoreConfig('estalymodule/settings/websites/website_'.$websiteId.'/estalyApiKey');;
        
    }

    private function getStoreId($websiteId) {
        return Mage::getStoreConfig('estalymodule/settings/websites/website_'.$websiteId.'/estalyStoreId');
    }

    public function sendOrderData(Varien_Event_Observer $observer)
    {
    
        $order = $observer->getEvent()->getOrder();
        $websiteId = $order->getStore()->getWebsiteId();

        if ($order->getStatus() !== 'complete') {
            return $this;
        }

        $billingAddress = $order->getBillingAddress();
        $orderData = [
            "source" => "magento1",
            "status"=> $order->getStatus(),
            "order" => [
                "reference_id" => $order->getIncrementId(),
                "customer" => [
                    "first_name" => $billingAddress->getFirstname(),
                    "last_name" => $billingAddress->getLastname(),
                    "email" => $order->getCustomerEmail(),
                ],
                "address" => [
                    "city" => $billingAddress->getCity(),
                    "country" => $billingAddress->getCountry(),
                    "zip_code" => $billingAddress->getPostcode(),
                    "address1" => $billingAddress->getStreetFull(),
                    "phone" => $billingAddress->getTelephone()
                ],
                "OrderItems" => []
            ]
        ];

        foreach ($order->getAllItems() as $item) {
            if ($item->getParentItem()) {
                continue;  // Skip si c'est un enfant d'un produit configurable
            }
        
            $product = Mage::getModel('catalog/product')->load($item->getProductId());
            
            // Si le type de produit est configurable, obtenir le produit simple associé
            if($item->getProductType() == "configurable") {
                $children = $item->getChildrenItems();
        
                if (count($children) > 0) {
                    $product = Mage::getModel('catalog/product')->load($children[0]->getProductId());
                }
            }

            $options = $item->getProductOptions();
        
            $orderData["order"]["OrderItems"][] = [
                "product_id" => $product->getId(),
                "sku" => $product->getSku(),
                "name" => $item->getName(),
                "price" => $item->getPrice(),
                "quantity" => $item->getQtyOrdered(),
                "options" => isset($options['options']) ? $options['options'] : [],
            ];
        }

        $storeId = $this->getStoreId($websiteId);

        $apiKey = $this->getApiKey($websiteId);
        $baseApiUrl = $this->getApiBaseUrl();
        $url = rtrim($baseApiUrl, '/') . "/api/v1/store/" . $storeId . "/orders";

        $headers = [
            "Authorization: " . $apiKey,
            "Content-Type: application/json"
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderData));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);
    }

    public function sendProductData(Varien_Event_Observer $observer)
    {
        $product = $observer->getEvent()->getProduct();

        $productData = [
            "source" => "magento1",
            "name" => $product->getName(),
            "sku" => $product->getSku(),
            "id" => $product->getId(),
            "price" => $product->getPrice(),
            "type" => $product->getTypeId(),
            "image_url" => $product->getImageUrl(),
            "description" => $product->getDescription(), 
            "status" => $product->getStatus()
        ];

        // Récupération des website_ids associés au produit
        $websiteIds = $product->getWebsiteIds();
        foreach ($websiteIds as $websiteId) {
            $storeId = $this->getStoreId($websiteId);
            $apiKey = $this->getApiKey($websiteId);
            $baseApiUrl = $this->getApiBaseUrl();
            $url = rtrim($baseApiUrl, '/') . "/api/v1/store/" . $storeId . "/products";

            $headers = [
                "Authorization: " . $apiKey,
                "Content-Type: application/json"
            ];

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($productData));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $response = curl_exec($ch);
            curl_close($ch);
        }
    }
}
